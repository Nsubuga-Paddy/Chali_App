"""
Build All Vector Databases for Deployment

This script builds all vector databases from their chunk files.
It's designed to run during Railway deployment.

Usage:
    python build_all_vector_dbs.py
"""

import subprocess
import sys
import logging
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Vector databases to build (in order)
BUILD_SCRIPTS = [
    {
        'name': 'MTN',
        'script': 'build_mtn_vector_db.py',
        'chunks_file': 'mtn_chunks.json',
        'db_dir': 'mtn_vector_db'
    },
    {
        'name': 'URA',
        'script': 'build_ura_vector_db.py',
        'chunks_file': 'ura_chunks.json',
        'db_dir': 'ura_vector_db'
    },
    {
        'name': 'NWSC',
        'script': 'build_nwsc_vector_db.py',
        'chunks_file': 'nwsc_chunks.json',
        'db_dir': 'nwsc_vector_db'
    },
    {
        'name': 'UEDCL',
        'script': 'build_uedcl_vector_db.py',
        'chunks_file': 'uedcl_chunks.json',
        'db_dir': 'uedcl_vector_db'
    },
]


def check_prerequisites():
    """Check if required files and packages are available."""
    logger.info("Checking prerequisites...")
    
    # Check Python packages
    try:
        import chromadb
        import sentence_transformers
        logger.info("✓ Python packages available")
    except ImportError as e:
        logger.error(f"✗ Missing Python package: {e}")
        logger.error("Please install: pip install -r requirements.txt")
        return False
    
    # Check if build scripts exist
    missing_scripts = []
    for db_config in BUILD_SCRIPTS:
        script_path = Path(db_config['script'])
        if not script_path.exists():
            missing_scripts.append(db_config['script'])
    
    if missing_scripts:
        logger.warning(f"⚠ Missing build scripts: {', '.join(missing_scripts)}")
        logger.warning("Some vector databases may not be built")
    
    return True


def build_vector_database(db_config: dict) -> bool:
    """Build a single vector database."""
    name = db_config['name']
    script = db_config['script']
    chunks_file = db_config['chunks_file']
    db_dir = db_config['db_dir']
    
    logger.info(f"\n{'='*80}")
    logger.info(f"Building {name} Vector Database")
    logger.info(f"{'='*80}")
    
    # Check if chunks file exists
    if not Path(chunks_file).exists():
        logger.warning(f"⚠ Chunks file not found: {chunks_file}")
        logger.warning(f"⚠ Skipping {name} vector database build")
        return False
    
    # Check if build script exists
    if not Path(script).exists():
        logger.warning(f"⚠ Build script not found: {script}")
        logger.warning(f"⚠ Skipping {name} vector database build")
        return False
    
    # Run build script
    try:
        logger.info(f"Running: python {script}")
        result = subprocess.run(
            [sys.executable, script],
            capture_output=True,
            text=True,
            check=True
        )
        
        # Log output
        if result.stdout:
            logger.info(result.stdout)
        if result.stderr:
            logger.warning(result.stderr)
        
        # Verify database was created
        if Path(db_dir).exists():
            logger.info(f"✓ {name} vector database built successfully")
            logger.info(f"  Location: {Path(db_dir).absolute()}")
            return True
        else:
            logger.error(f"✗ {name} vector database directory not found after build")
            return False
            
    except subprocess.CalledProcessError as e:
        logger.error(f"✗ Error building {name} vector database")
        logger.error(f"  Return code: {e.returncode}")
        if e.stdout:
            logger.error(f"  stdout: {e.stdout}")
        if e.stderr:
            logger.error(f"  stderr: {e.stderr}")
        return False
    except Exception as e:
        logger.error(f"✗ Unexpected error building {name} vector database: {e}")
        return False


def main():
    """Main function to build all vector databases."""
    logger.info("="*80)
    logger.info("Building All Vector Databases for Deployment")
    logger.info("="*80)
    
    # Check prerequisites
    if not check_prerequisites():
        logger.error("Prerequisites check failed. Exiting.")
        sys.exit(1)
    
    # Build each database
    results = {}
    for db_config in BUILD_SCRIPTS:
        success = build_vector_database(db_config)
        results[db_config['name']] = success
    
    # Summary
    logger.info("\n" + "="*80)
    logger.info("Build Summary")
    logger.info("="*80)
    
    successful = [name for name, success in results.items() if success]
    failed = [name for name, success in results.items() if not success]
    
    if successful:
        logger.info(f"✓ Successfully built: {', '.join(successful)}")
    
    if failed:
        logger.warning(f"⚠ Failed to build: {', '.join(failed)}")
    
    # Exit with error if any failed
    if failed:
        logger.warning("\n⚠ Some vector databases failed to build.")
        logger.warning("The application may not work correctly for those services.")
        # Don't exit with error code - allow deployment to continue
        # sys.exit(1)
    else:
        logger.info("\n✓ All vector databases built successfully!")
    
    logger.info("="*80)


if __name__ == "__main__":
    main()
