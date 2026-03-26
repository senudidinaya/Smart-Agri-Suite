
import ee
import os
from dotenv import load_dotenv

load_dotenv()

def diagnose():
    print("--- GEE Diagnostics ---")
    project_from_env = os.getenv("GEE_PROJECT")
    print(f"Project from ENV: {project_from_env}")
    
    try:
        # Try initializing with the project from env
        if project_from_env:
            ee.Initialize(project=project_from_env)
            print("✅ ee.Initialize succeeded")
        else:
            ee.Initialize()
            print("✅ Initialized using default project")
            
        # Try a real operation: Get info of a constant
        val = ee.Number(42).getInfo()
        print(f"✅ GEE Data Operation Success: Value is {val}")
        
        # Try to access a public collection (requires project permission)
        img_count = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED').filterDate('2023-01-01', '2023-01-02').size().getInfo()
        print(f"✅ GEE Collection Access Success! Found {img_count} images.")
        
    except Exception as e:
        print(f"❌ Diagnostic failed: {e}")

if __name__ == "__main__":
    diagnose()
