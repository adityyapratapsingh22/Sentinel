import cv2
import tempfile
import os
import io
import base64
import hashlib
import torch
import timm
import torch.nn as nn
import numpy as np
from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, Header
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from facenet_pytorch import MTCNN
from PIL import Image
from torchvision import transforms
from pytorch_grad_cam import GradCAM
from pytorch_grad_cam.utils.image import show_cam_on_image
from pytorch_grad_cam.utils.model_targets import ClassifierOutputTarget
from typing import Optional

import database as db

# ---------- one-time setup ----------
db.init_db()

device = 'cuda' if torch.cuda.is_available() else 'cpu'

IMG_SIZE = 224
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]

eval_tf = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
])

mtcnn = MTCNN(image_size=224, margin=20, post_process=False, device=device)


class DualBranchModel(nn.Module):
    def __init__(self, cnn_backbone, fft_dim=32, num_classes=2):
        super().__init__()
        self.cnn = cnn_backbone
        cnn_feat_dim = self.cnn.classifier.in_features
        self.cnn.classifier = nn.Identity()
        self.fft_branch = nn.Sequential(
            nn.Linear(fft_dim, 64), nn.ReLU(),
            nn.Linear(64, 32), nn.ReLU(),
        )
        self.combined_classifier = nn.Linear(cnn_feat_dim + 32, num_classes)

    def forward(self, img, fft_feat):
        cnn_out = self.cnn(img)
        fft_out = self.fft_branch(fft_feat)
        combined = torch.cat([cnn_out, fft_out], dim=1)
        return self.combined_classifier(combined)


def compute_fft_features(img_tensor):
    gray = img_tensor.mean(dim=0).numpy()
    f = np.fft.fft2(gray)
    fshift = np.fft.fftshift(f)
    magnitude = np.log(np.abs(fshift) + 1e-8)
    h, w = magnitude.shape
    center = (h // 2, w // 2)
    y, x = np.indices((h, w))
    r = np.sqrt((x - center[1]) ** 2 + (y - center[0]) ** 2).astype(int)
    radial_mean = np.bincount(r.ravel(), magnitude.ravel()) / np.bincount(r.ravel())
    bins = np.linspace(0, len(radial_mean), 33).astype(int)
    features = [radial_mean[bins[i]:bins[i + 1]].mean() for i in range(32)]
    return np.array(features, dtype=np.float32)


print("Loading model...")
backbone = timm.create_model('efficientnet_b0', pretrained=True, num_classes=2)
backbone = backbone.to(device)
backbone.load_state_dict(torch.load('./models/efficientnet_b0_baseline.pth', map_location=device))

model = DualBranchModel(backbone, fft_dim=32, num_classes=2).to(device)
model.load_state_dict(torch.load('./models/dual_branch_video_finetuned.pth', map_location=device))
model.eval()

print("Model loaded successfully.")

# Grad-CAM setup — targets the CNN backbone's last conv block.
#
# IMPORTANT: pytorch-grad-cam always calls `model(input_tensor)` with a single
# argument internally, but our DualBranchModel.forward() takes (img, fft_feat).
# We fix this by wrapping the model per-request in a tiny adapter that closes
# over the fixed fft_feat for that request, so GradCAM only ever sees a
# single-input forward() — this was the actual bug causing every heatmap
# request to silently fail.
class _GradCamAdapter(nn.Module):
    def __init__(self, dual_model, fft_feat):
        super().__init__()
        self.dual_model = dual_model
        self.fft_feat = fft_feat

    def forward(self, img):
        return self.dual_model(img, self.fft_feat)


def image_to_base64(pil_img: Image.Image) -> str:
    buf = io.BytesIO()
    pil_img.save(buf, format="JPEG", quality=85)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


def compute_gradcam_overlay(img_tensor: torch.Tensor, fft_feat: torch.Tensor, pred_class: int) -> str:
    """Returns a base64 JPEG of the face with a Grad-CAM heatmap overlaid."""
    try:
        img_tensor_batched = img_tensor.unsqueeze(0).to(device)
        adapter = _GradCamAdapter(model, fft_feat)

        with GradCAM(model=adapter, target_layers=[model.cnn.conv_head]) as cam:
            targets = [ClassifierOutputTarget(pred_class)]
            grayscale_cam = cam(input_tensor=img_tensor_batched, targets=targets)[0]

        img_display = img_tensor.permute(1, 2, 0).cpu().numpy()
        img_display = img_display * np.array(IMAGENET_STD) + np.array(IMAGENET_MEAN)
        img_display = img_display.clip(0, 1)

        visualization = show_cam_on_image(img_display, grayscale_cam, use_rgb=True)
        return image_to_base64(Image.fromarray(visualization))
    except Exception:
        import traceback
        print("Grad-CAM generation failed:")
        traceback.print_exc()
        return None


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# Auth helpers
# ============================================================

def get_current_user(authorization: Optional[str] = Header(None)):
    """
    Reads 'Authorization: Bearer <token>' header.
    Returns the user dict, or None if not authenticated (auth is optional
    for /predict endpoints, required for /history, /analytics, /profile).
    """
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ", 1)[1]
    return db.get_user_from_token(token)


def require_user(authorization: Optional[str] = Header(None)):
    user = get_current_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


# ============================================================
# Auth endpoints
# ============================================================

class SignupRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


@app.post("/auth/signup")
async def signup(payload: SignupRequest):
    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    try:
        user_id = db.create_user(payload.name, payload.email, payload.password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    token = db.create_session(user_id)
    user = db.get_user_by_id(user_id)
    return {"token": token, "user": {"id": user["id"], "name": user["name"], "email": user["email"]}}


@app.post("/auth/login")
async def login(payload: LoginRequest):
    user = db.get_user_by_email(payload.email)
    if not user or not db.verify_password(payload.password, user["salt"], user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = db.create_session(user["id"])
    return {"token": token, "user": {"id": user["id"], "name": user["name"], "email": user["email"]}}


@app.get("/auth/me")
async def me(user=Depends(require_user)):
    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "organization": user["organization"],
        "photo": user["photo"],
        "created_at": user["created_at"],
    }


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@app.post("/auth/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest):
    user = db.get_user_by_email(payload.email)
    # Always return success even if the email doesn't exist, so this endpoint
    # can't be used to check which emails are registered.
    if not user:
        return {"message": "If that email is registered, a reset token has been issued."}

    token = db.create_reset_token(user["id"])
    # NOTE: this is a local, single-user research demo with no email server
    # configured, so the reset token is returned directly in the response
    # instead of being emailed. In a real deployment this would be sent to
    # the user's email address instead of returned here.
    return {
        "message": "Reset token issued (returned directly since no email server is configured).",
        "reset_token": token,
        "expires_in_minutes": 30,
    }


@app.post("/auth/reset-password")
async def reset_password(payload: ResetPasswordRequest):
    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    user_id = db.consume_reset_token(payload.token)
    if not user_id:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    db.update_password(user_id, payload.new_password)
    return {"message": "Password reset successfully."}


# ============================================================
# Profile endpoints
# ============================================================

class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    organization: Optional[str] = None


@app.put("/profile")
async def update_profile(payload: ProfileUpdateRequest, user=Depends(require_user)):
    db.update_user(user["id"], name=payload.name, organization=payload.organization)
    updated = db.get_user_by_id(user["id"])
    return {
        "id": updated["id"],
        "name": updated["name"],
        "email": updated["email"],
        "organization": updated["organization"],
        "photo": updated["photo"],
    }


@app.put("/profile/password")
async def change_password(payload: ChangePasswordRequest, user=Depends(require_user)):
    if not db.verify_password(payload.current_password, user["salt"], user["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    db.update_password(user["id"], payload.new_password)
    return {"message": "Password changed successfully."}


@app.post("/profile/photo")
async def upload_photo(file: UploadFile = File(...), user=Depends(require_user)):
    contents = await file.read()
    if len(contents) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large (max 2MB)")
    img = Image.open(io.BytesIO(contents)).convert("RGB")
    img.thumbnail((256, 256))
    photo_b64 = image_to_base64(img)
    db.update_photo(user["id"], photo_b64)
    return {"photo": photo_b64}


# ============================================================
# Prediction endpoints (auth optional: logged-in users get history saved)
# ============================================================

@app.post("/predict/image")
async def predict_image(file: UploadFile = File(...), user=Depends(get_current_user)):
    contents = await file.read()
    sha256 = hashlib.sha256(contents).hexdigest()
    img = Image.open(io.BytesIO(contents)).convert('RGB')

    face = mtcnn(img)
    if face is None:
        face_pil = img.resize((224, 224))
    else:
        face_img = face.permute(1, 2, 0).byte().numpy()
        face_pil = Image.fromarray(face_img)

    img_tensor = eval_tf(face_pil)
    fft_feat_arr = compute_fft_features(img_tensor)
    fft_feat = torch.tensor(fft_feat_arr).unsqueeze(0).to(device)
    img_tensor_batched = img_tensor.unsqueeze(0).to(device)

    with torch.no_grad():
        output = model(img_tensor_batched, fft_feat)
        probs = torch.softmax(output, dim=1)[0]
        fake_prob = probs[0].item()
        real_prob = probs[1].item()

    verdict = "fake" if fake_prob > real_prob else "real"
    confidence = max(fake_prob, real_prob)
    pred_class = 0 if verdict == "fake" else 1

    heatmap_b64 = compute_gradcam_overlay(img_tensor, fft_feat, pred_class)
    face_thumb_b64 = image_to_base64(face_pil)

    if user:
        db.add_detection(
            user_id=user["id"], filename=file.filename, media_type="image",
            verdict=verdict, confidence=confidence, sha256=sha256,
        )

    return JSONResponse({
        "verdict": verdict,
        "confidence": round(confidence, 4),
        "fake_probability": round(fake_prob, 4),
        "real_probability": round(real_prob, 4),
        "sha256": sha256,
        "fft_profile": [round(float(v), 4) for v in fft_feat_arr],
        "face_thumbnail": face_thumb_b64,
        "heatmap": heatmap_b64,
    })


@app.post("/predict/video")
async def predict_video_endpoint(file: UploadFile = File(...), user=Depends(get_current_user)):
    contents = await file.read()
    sha256 = hashlib.sha256(contents).hexdigest()

    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
        tmp.write(contents)
        tmp_path = tmp.name

    try:
        cap = cv2.VideoCapture(tmp_path)
        frame_idx = 0
        sample_every_n = 15
        max_frames = 15
        fake_probs = []
        frame_results = []

        while True:
            ret, frame = cap.read()
            if not ret:
                break
            if frame_idx % sample_every_n == 0:
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                img = Image.fromarray(frame_rgb)

                face = mtcnn(img)
                if face is None:
                    frame_idx += 1
                    continue
                face_img = face.permute(1, 2, 0).byte().numpy()
                face_pil = Image.fromarray(face_img)

                img_tensor = eval_tf(face_pil)
                fft_feat = torch.tensor(compute_fft_features(img_tensor)).unsqueeze(0).to(device)
                img_tensor_batched = img_tensor.unsqueeze(0).to(device)

                with torch.no_grad():
                    output = model(img_tensor_batched, fft_feat)
                    prob_fake = torch.softmax(output, dim=1)[0, 0].item()

                fake_probs.append(prob_fake)
                frame_results.append({
                    "frame_index": frame_idx,
                    "fake_probability": round(prob_fake, 4),
                    "thumbnail": image_to_base64(face_pil),
                })

                if len(fake_probs) >= max_frames:
                    break
            frame_idx += 1

        cap.release()

        if len(fake_probs) == 0:
            return JSONResponse({"error": "No faces detected in sampled frames"}, status_code=422)

        avg_fake_prob = sum(fake_probs) / len(fake_probs)
        verdict = "fake" if avg_fake_prob > 0.5 else "real"

        if user:
            db.add_detection(
                user_id=user["id"], filename=file.filename, media_type="video",
                verdict=verdict, confidence=avg_fake_prob if verdict == "fake" else (1 - avg_fake_prob),
                sha256=sha256, n_frames_analyzed=len(fake_probs),
            )

        return JSONResponse({
            "verdict": verdict,
            "avg_fake_probability": round(avg_fake_prob, 4),
            "n_frames_analyzed": len(fake_probs),
            "per_frame_scores": frame_results,
            "sha256": sha256,
        })

    finally:
        os.unlink(tmp_path)


# ============================================================
# History + Analytics endpoints (require auth)
# ============================================================

@app.get("/history")
async def history(page: int = 1, page_size: int = 10, verdict: str = "all",
                   media_type: str = "all", user=Depends(require_user)):
    rows, total = db.get_history(
        user["id"], page=page, page_size=page_size,
        verdict_filter=verdict, media_type_filter=media_type,
    )
    return {"total": total, "page": page, "page_size": page_size, "results": rows}


@app.get("/analytics")
async def analytics(user=Depends(require_user)):
    return db.get_analytics(user["id"])


# ============================================================
# Serve frontend last (catch-all)
# ============================================================
app.mount("/", StaticFiles(directory="../frontend", html=True), name="frontend")
