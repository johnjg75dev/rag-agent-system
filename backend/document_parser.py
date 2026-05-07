"""Document parsers for multiple file formats."""
import io
import os
from typing import List, Dict, Any, Optional
from pathlib import Path

# Text formats
def parse_txt(file_bytes: bytes) -> str:
    return file_bytes.decode('utf-8', errors='ignore')

def parse_md(file_bytes: bytes) -> str:
    return file_bytes.decode('utf-8', errors='ignore')

def parse_csv(file_bytes: bytes) -> str:
    return file_bytes.decode('utf-8', errors='ignore')

def parse_json(file_bytes: bytes) -> str:
    return file_bytes.decode('utf-8', errors='ignore')

# PDF
def parse_pdf(file_bytes: bytes) -> str:
    try:
        import pdfplumber
        text_parts = []
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
        return "\n".join(text_parts)
    except Exception:
        # Fallback to PyPDF2
        try:
            from PyPDF2 import PdfReader
            reader = PdfReader(io.BytesIO(file_bytes))
            text_parts = []
            for page in reader.pages:
                text_parts.append(page.extract_text() or "")
            return "\n".join(text_parts)
        except Exception as e:
            raise ValueError(f"Failed to parse PDF: {e}")

# DOCX
def parse_docx(file_bytes: bytes) -> str:
    try:
        from docx import Document
        doc = Document(io.BytesIO(file_bytes))
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        return "\n".join(paragraphs)
    except Exception as e:
        raise ValueError(f"Failed to parse DOCX: {e}")

# Image parsing (return image paths or base64)
def parse_image(file_bytes: bytes, filename: str) -> Dict[str, Any]:
    """Parse image file - returns metadata for vision model processing."""
    from PIL import Image
    img = Image.open(io.BytesIO(file_bytes))
    return {
        "type": "image",
        "filename": filename,
        "format": img.format,
        "size": img.size,
        "mode": img.mode,
        "bytes": file_bytes,
    }

# Extension to parser mapping
PARSERS = {
    ".txt": parse_txt,
    ".md": parse_md,
    ".csv": parse_csv,
    ".json": parse_json,
    ".pdf": parse_pdf,
    ".docx": parse_docx,
}

# Image extensions
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp", ".tiff", ".tif"}

def get_parser_for_file(filename: str):
    """Get the appropriate parser for a file based on extension."""
    ext = os.path.splitext(filename.lower())[1]
    return PARSERS.get(ext)

def is_image_file(filename: str) -> bool:
    """Check if file is an image."""
    ext = os.path.splitext(filename.lower())[1]
    return ext in IMAGE_EXTENSIONS

def parse_file(file_bytes: bytes, filename: str) -> Dict[str, Any]:
    """
    Parse a file and return structured content.
    Returns dict with keys: type ('text' | 'image'), content, metadata
    """
    ext = os.path.splitext(filename.lower())[1]
    
    if ext in IMAGE_EXTENSIONS:
        return {
            "type": "image",
            "content": parse_image(file_bytes, filename),
            "metadata": {"filename": filename, "format": ext}
        }
    
    parser = PARSERS.get(ext)
    if parser:
        try:
            text = parser(file_bytes)
            return {
                "type": "text",
                "content": text,
                "metadata": {"filename": filename, "format": ext, "length": len(text)}
            }
        except Exception as e:
            return {
                "type": "error",
                "content": str(e),
                "metadata": {"filename": filename, "format": ext}
            }
    
    # Unknown format - try to read as text
    try:
        text = file_bytes.decode('utf-8', errors='ignore')
        return {
            "type": "text",
            "content": text,
            "metadata": {"filename": filename, "format": ext, "length": len(text)}
        }
    except Exception as e:
        return {
            "type": "error",
            "content": str(e),
            "metadata": {"filename": filename, "format": ext}
        }
