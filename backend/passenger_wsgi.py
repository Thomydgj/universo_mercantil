import os
import sys

# Ensure backend directory is in Python path for Plesk/Passenger.
CURRENT_DIR = os.path.dirname(__file__)
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from app import app as application
