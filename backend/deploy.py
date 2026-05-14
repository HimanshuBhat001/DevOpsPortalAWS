import subprocess
import time
import sys
import os
import shutil
import stat
from datetime import datetime


def log_writer(log_file):
    def log(msg):
        line = f"[{datetime.now()}] {msg}"
        print(line)
        log_file.write((line + "\n").encode("utf-8", errors="ignore").decode("utf-8"))
        log_file.flush()
    return log


def handle_remove_readonly(func, path, exc):
    """Fix Windows permission issues"""
    os.chmod(path, stat.S_IWRITE)
    func(path)


def kill_git_processes(log):
    """Kill any git processes locking files (Windows fix)"""
    try:
        subprocess.run(["taskkill", "/F", "/IM", "git.exe"], capture_output=True)
        subprocess.run(["taskkill", "/F", "/IM", "ssh.exe"], capture_output=True)
        log("Killed git/ssh processes (if any)")
    except Exception as e:
        log(f"Process kill error (ignored): {str(e)}")


def safe_delete(path, log):
    """Robust delete with retries"""
    if os.path.exists(path):
        for attempt in range(5):
            try:
                shutil.rmtree(path, onerror=handle_remove_readonly)
                if not os.path.exists(path):
                    log(f"Deleted: {path}")
                    return
            except Exception as e:
                log(f"Delete attempt {attempt+1} failed: {str(e)}")
                time.sleep(2)

        raise Exception(f"Failed to delete {path}")


# 🔥 UPDATED FUNCTION (MAIN FIX)
def run_command(step, log, cwd):
    """Run subprocess command with LIVE output"""
    log(f"RUNNING: {' '.join(step)}")

    process = subprocess.Popen(
        step,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        cwd=cwd
    )

    # ✅ STREAM OUTPUT LIVE (fixes your issue)
    for line in process.stdout:
        log(line.strip())

    process.wait()

    if process.returncode != 0:
        log(f"FAILED with code {process.returncode}")
        return False

    log("✓ Done")
    return True


def run_deploy(repo, branch, log_path="deploy.log"):
    start = time.time()
    success = True

    base_dir = os.path.dirname(os.path.abspath(__file__))

    # 🔥 Unique repo folder (NO conflicts ever)
    repo_dir = os.path.join(base_dir, f"repo_{int(time.time())}")

    with open(log_path, "a", encoding="utf-8") as f:
        log = log_writer(f)

        log(f"=== DEPLOY STARTED: {repo} @ {branch} ===")

        # Step 1: Kill any locking processes
        kill_git_processes(log)
        time.sleep(1)

        # Step 2: Clone repo (with live logs now)
        if not run_command(
            [
    "git",
    "-c", "credential.helper=",
    "-c", "core.askpass=",
    "-c", "http.sslVerify=false",
    "clone",
    "--progress",
    "--branch", branch,
    repo,
    repo_dir
],
            log,
            base_dir
        ):
            success = False

        # Step 3: Install dependencies (if exists)
        requirements_path = os.path.join(repo_dir, "requirements.txt")
        if success and os.path.exists(requirements_path):
            if not run_command(
                ["pip", "install", "-r", requirements_path],
                log,
                base_dir
            ):
                success = False
        else:
            log("No requirements.txt found, skipping dependency install")

        # Final status
        elapsed = round(time.time() - start, 2)
        status = "success" if success else "failed"

        log(f"=== DEPLOY {status.upper()} in {elapsed}s ===")

    # 🔥 Optional cleanup
    try:
        kill_git_processes(lambda x: None)
        safe_delete(repo_dir, lambda x: None)
    except:
        pass

    return status, elapsed


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python deploy.py <repo_url> [branch]")
        sys.exit(1)

    repo = sys.argv[1]
    branch = sys.argv[2] if len(sys.argv) > 2 else "main"

    status, elapsed = run_deploy(repo, branch)

    print(f"\nFinal Status: {status} (Time: {elapsed}s)")