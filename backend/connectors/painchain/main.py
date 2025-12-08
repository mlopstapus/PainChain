import os
import time
from datetime import datetime
from connector import PainChainConnector

# Configuration from environment variables
POLL_INTERVAL = int(os.getenv("POLL_INTERVAL", "300"))  # Default 5 minutes


def main():
    """Main polling loop for PainChain connector"""

    print("=" * 60)
    print("PainChain - PainChain Connector")
    print("=" * 60)
    print(f"Poll Interval: {POLL_INTERVAL} seconds")
    print("Note: PainChain logs events in real-time, not via polling")
    print("=" * 60)

    connector = PainChainConnector()

    # Test connection
    if not connector.test_connection():
        print("ERROR: PainChain connection test failed.")
        return

    print("PainChain connector is active!")
    print()

    # Main polling loop (for consistency with other connectors)
    while True:
        try:
            print(f"[{datetime.now().isoformat()}] PainChain connector active")
            print(f"  - Events are logged in real-time via API")
            print(f"  - No polling required")
            print()

        except Exception as e:
            print(f"[{datetime.now().isoformat()}] ERROR: {e}")
            print()

        print(f"Sleeping for {POLL_INTERVAL} seconds...")
        print("-" * 60)
        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
