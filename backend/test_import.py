#!/usr/bin/env python
import sys
try:
    import idle_land_api
    print("Module loaded successfully")
except Exception as e:
    import traceback
    print("=== IMPORT ERROR ===")
    traceback.print_exc()
    sys.exit(1)
