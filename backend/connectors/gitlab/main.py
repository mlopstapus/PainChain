import os
import time
from datetime import datetime
from connector import GitLabConnector

# Configuration from environment variables
GITLAB_TOKEN = os.getenv("GITLAB_TOKEN", "")
GITLAB_URL = os.getenv("GITLAB_URL", "https://gitlab.com")
POLL_INTERVAL = int(os.getenv("POLL_INTERVAL", "300"))  # Default 5 minutes
REPOS = os.getenv("REPOS", "").split(",") if os.getenv("REPOS") else []
REPOS = [r.strip() for r in REPOS if r.strip()]  # Clean up repo list


def main():
    """Main polling loop for GitLab connector"""

    if not GITLAB_TOKEN:
        print("ERROR: GITLAB_TOKEN not set. Exiting.")
        return

    print("=" * 60)
    print("PainChain - GitLab Connector")
    print("=" * 60)
    print(f"GitLab URL: {GITLAB_URL}")
    print(f"Poll Interval: {POLL_INTERVAL} seconds")
    print(f"Projects: {REPOS if REPOS else 'All user projects (max 10)'}")
    print("=" * 60)

    connector = GitLabConnector(token=GITLAB_TOKEN, url=GITLAB_URL, repos=REPOS)

    # Test connection
    if not connector.test_connection():
        print("ERROR: Failed to connect to GitLab. Check your token and URL.")
        return

    print("Connected to GitLab successfully!")
    print()

    # Main polling loop
    while True:
        try:
            print(f"[{datetime.now().isoformat()}] Starting sync...")

            result = connector.fetch_and_store_changes()

            print(f"[{datetime.now().isoformat()}] Sync complete:")
            print(f"  - Fetched: {result['fetched']} events")
            print(f"  - Stored: {result['stored']} new events")
            print()

        except Exception as e:
            print(f"[{datetime.now().isoformat()}] ERROR: {e}")
            print()

        print(f"Sleeping for {POLL_INTERVAL} seconds...")
        print("-" * 60)
        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
