#!/usr/bin/env python3
"""
Publish script for RAG Agent System.
Handles packaging and publishing to PyPI.
"""
import os
import sys
import subprocess
import shutil
from pathlib import Path


def run_command(cmd, cwd=None):
    """Run a shell command and return the result."""
    print(f"Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error: {result.stderr}")
        sys.exit(1)
    return result


def check_requirements():
    """Check if required files exist."""
    required = ["setup.py", "requirements.txt", "README.md"]
    for file in required:
        if not Path(file).exists():
            print(f"Error: Required file {file} not found")
            sys.exit(1)
    print("[OK] All required files exist")


def clean_dist():
    """Clean distribution directories."""
    for dir in ["dist", "build", "*.egg-info"]:
        path = Path(dir)
        if path.exists():
            shutil.rmtree(path)
            print(f"[OK] Cleaned {dir}")


def build_package():
    """Build the package."""
    print("\n--- Building package ---")
    run_command([sys.executable, "-m", "build", "--no-isolation"])
    print("[OK] Package built successfully")


def publish_to_pypi(test_mode=True):
    """Publish to PyPI or TestPyPI."""
    repo = "testpypi" if test_mode else "pypi"
    print(f"\n--- Publishing to {repo} ---")
    run_command([sys.executable, "-m", "twine", "upload", "--repository", repo, "dist/*"])
    print(f"[OK] Published to {repo}")


def publish_to_github_release(version):
    """Create a GitHub release."""
    print(f"\n--- Creating GitHub release v{version} ---")
    run_command(["git", "tag", "-a", f"v{version}", "-m", f"Release version {version}"])
    run_command(["git", "push", "origin", f"v{version}"])
    print(f"[OK] GitHub release v{version} created")


def main():
    """Main publish workflow."""
    import argparse
    parser = argparse.ArgumentParser(description="Publish RAG Agent System")
    parser.add_argument("--test", action="store_true", help="Publish to TestPyPI")
    parser.add_argument("--version", type=str, help="Version number for release")
    parser.add_argument("--skip-tests", action="store_true", help="Skip running tests")
    args = parser.parse_args()
    
    # Change to project root
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    print("=== RAG Agent System Publish Script ===\n")
    
    # Check requirements
    check_requirements()
    
    # Run tests
    if not args.skip_tests:
        print("\n--- Running tests ---")
        result = subprocess.run([sys.executable, "-m", "pytest", "tests/", "-v"], capture_output=True, text=True)
        print(result.stdout)
        if result.returncode != 0:
            print("Tests failed! Aborting publish.")
            sys.exit(1)
        print("[OK] All tests passed")
    
    # Clean previous builds
    clean_dist()
    
    # Build package
    build_package()
    
    # Publish to PyPI
    if os.getenv("PUBLISH_PYPI", "false").lower() == "true":
        publish_to_pypi(test_mode=args.test)
    
    # Create GitHub release
    if args.version:
        publish_to_github_release(args.version)
    
    print("\n=== Publish completed successfully ===")


if __name__ == "__main__":
    main()
