"""
Advanced Liveness Detection with Deep Learning
Uses MobileNetV2 for anti-spoofing detection
"""

import io
from typing import Any, Dict, Tuple

import cv2
import numpy as np
from PIL import Image

try:
    import tensorflow as tf
    from tensorflow.keras.applications import MobileNetV2
    from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
    TF_AVAILABLE = True
except ImportError:
    TF_AVAILABLE = False


class AdvancedLivenessDetector:
    """Deep learning-based liveness detection for anti-spoofing."""
    
    def __init__(self):
        self.use_dl = TF_AVAILABLE
        
        if self.use_dl:
            # Load pretrained MobileNetV2 (lightweight, mobile-friendly)
            self.model = MobileNetV2(
                weights='imagenet',
                include_top=False,
                pooling='avg',
                input_shape=(224, 224, 3)
            )
            # Freeze the model (we're using it for feature extraction)
            self.model.trainable = False
        
        # Haar Cascade for face detection
        cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        self.face_cascade = cv2.CascadeClassifier(cascade_path)
    
    def detect_liveness(self, image_bytes: bytes) -> Tuple[bool, float, str]:
        """
        Advanced liveness detection combining multiple techniques.
        
        Returns:
            (is_live, confidence, reason)
        """
        
        # Convert bytes to image
        image = Image.open(io.BytesIO(image_bytes))
        img_array = np.array(image)
        
        # Run multiple checks
        checks = {
            "texture_analysis": self._check_texture_analysis(img_array),
            "color_diversity": self._check_color_diversity(img_array),
            "face_detection": self._check_face_detection(img_array),
            "sharpness": self._check_sharpness(img_array),
        }
        
        if self.use_dl:
            checks["deep_features"] = self._check_deep_features(img_array)
        
        # Aggregate results
        passed_checks = sum(1 for result in checks.values() if result["passed"])
        total_checks = len(checks)
        confidence = passed_checks / total_checks
        
        # Determine if live
        is_live = confidence >= 0.6  # At least 60% of checks must pass
        
        # Generate reason
        failed_checks = [name for name, result in checks.items() if not result["passed"]]
        if failed_checks:
            reason = f"Failed: {', '.join(failed_checks)}"
        else:
            reason = "All liveness checks passed"
        
        return is_live, confidence, reason
    
    def _check_texture_analysis(self, img_array: np.ndarray) -> Dict[str, Any]:
        """
        Analyze image texture to detect screens/photos.
        Real faces have more texture variation than screens.
        """
        
        # Convert to grayscale
        if len(img_array.shape) == 3:
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        else:
            gray = img_array
        
        # Calculate Local Binary Pattern (LBP) variance
        # Real faces have higher LBP variance
        lbp = self._calculate_lbp(gray)
        lbp_var = np.var(lbp)
        
        # Threshold determined empirically
        passed = lbp_var > 100
        
        return {
            "passed": passed,
            "score": float(lbp_var),
            "threshold": 100,
        }
    
    def _calculate_lbp(self, gray: np.ndarray) -> np.ndarray:
        """Calculate Local Binary Pattern."""
        lbp = np.zeros_like(gray, dtype=np.uint8)
        
        for i in range(1, gray.shape[0] - 1):
            for j in range(1, gray.shape[1] - 1):
                center = gray[i, j]
                code = 0
                code |= (gray[i-1, j-1] > center) << 0
                code |= (gray[i-1, j] > center) << 1
                code |= (gray[i-1, j+1] > center) << 2
                code |= (gray[i, j+1] > center) << 3
                code |= (gray[i+1, j+1] > center) << 4
                code |= (gray[i+1, j] > center) << 5
                code |= (gray[i+1, j-1] > center) << 6
                code |= (gray[i, j-1] > center) << 7
                lbp[i, j] = code
        
        return lbp
    
    def _check_color_diversity(self, img_array: np.ndarray) -> Dict[str, Any]:
        """
        Check color diversity. Screens tend to have less color variation.
        """
        
        if len(img_array.shape) != 3:
            return {"passed": False, "score": 0, "reason": "Not a color image"}
        
        # Calculate color histogram entropy
        hist_r = cv2.calcHist([img_array], [0], None, [256], [0, 256])
        hist_g = cv2.calcHist([img_array], [1], None, [256], [0, 256])
        hist_b = cv2.calcHist([img_array], [2], None, [256], [0, 256])
        
        # Calculate entropy
        def entropy(hist):
            hist = hist / hist.sum()
            hist = hist[hist > 0]
            return -np.sum(hist * np.log2(hist))
        
        avg_entropy = (entropy(hist_r) + entropy(hist_g) + entropy(hist_b)) / 3
        
        # Real faces typically have entropy > 5
        passed = avg_entropy > 5.0
        
        return {
            "passed": passed,
            "score": float(avg_entropy),
            "threshold": 5.0,
        }
    
    def _check_face_detection(self, img_array: np.ndarray) -> Dict[str, Any]:
        """
        Detect face and check quality.
        """
        
        # Convert to grayscale for face detection
        if len(img_array.shape) == 3:
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        else:
            gray = img_array
        
        # Detect faces
        faces = self.face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(30, 30)
        )
        
        # Should detect exactly 1 face
        passed = len(faces) == 1
        
        return {
            "passed": passed,
            "face_count": len(faces),
            "expected": 1,
        }
    
    def _check_sharpness(self, img_array: np.ndarray) -> Dict[str, Any]:
        """
        Check image sharpness. Blurry images suggest photo of photo.
        """
        
        # Convert to grayscale
        if len(img_array.shape) == 3:
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        else:
            gray = img_array
        
        # Calculate Laplacian variance (measure of sharpness)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        
        # Real faces should have sharpness > 100
        passed = laplacian_var > 100
        
        return {
            "passed": passed,
            "score": float(laplacian_var),
            "threshold": 100,
        }
    
    def _check_deep_features(self, img_array: np.ndarray) -> Dict[str, Any]:
        """
        Use deep learning features to detect spoofing.
        """
        
        if not self.use_dl:
            return {"passed": True, "note": "Deep learning not available"}
        
        try:
            # Resize to 224x224 for MobileNetV2
            img_resized = cv2.resize(img_array, (224, 224))
            
            # Preprocess
            img_batch = np.expand_dims(img_resized, axis=0)
            img_preprocessed = preprocess_input(img_batch)
            
            # Extract features
            features = self.model.predict(img_preprocessed, verbose=0)[0]
            
            # Calculate feature statistics
            feature_mean = np.mean(features)
            feature_std = np.std(features)
            
            # Real faces tend to have more diverse features
            # This is a simplified heuristic - in production, train a classifier
            passed = feature_std > 0.5
            
            return {
                "passed": passed,
                "feature_mean": float(feature_mean),
                "feature_std": float(feature_std),
            }
        except Exception as e:
            return {"passed": True, "error": str(e)}


# Global instance
_advanced_liveness_detector = None


def get_advanced_liveness_detector() -> AdvancedLivenessDetector:
    """Get singleton liveness detector."""
    global _advanced_liveness_detector
    if _advanced_liveness_detector is None:
        _advanced_liveness_detector = AdvancedLivenessDetector()
    return _advanced_liveness_detector
