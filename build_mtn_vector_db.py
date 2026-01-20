"""
Build MTN Vector Database from chunks.json

This script reads mtn_chunks.json and creates a ChromaDB vector database
for semantic search.

Usage:
    python build_mtn_vector_db.py
"""

import json
import os
from pathlib import Path
from typing import List, Dict
import logging

try:
    import chromadb
    from chromadb.config import Settings
    from sentence_transformers import SentenceTransformer
except ImportError:
    print("Missing required packages. Please install:")
    print("   pip install chromadb sentence-transformers")
    exit(1)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
EMBEDDING_MODEL = "all-MiniLM-L6-v2"  # Same as URA, UEDCL, and NWSC for consistency
COLLECTION_NAME = "mtn_customer_service"
DB_DIR = "mtn_vector_db"
CHUNKS_FILE = "mtn_chunks.json"


def load_chunks(file_path: str) -> Dict:
    """Load chunks from JSON file."""
    logger.info(f"Loading chunks from: {file_path}")
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    logger.info(f"Loaded {data.get('total_chunks', 0)} chunks")
    return data


def prepare_documents(chunks_data: Dict) -> tuple:
    """
    Prepare documents, metadata, and IDs for ChromaDB.
    
    Returns:
        (documents, metadatas, ids)
    """
    documents = []
    metadatas = []
    ids = []
    
    chunks = chunks_data.get('chunks', [])
    
    for idx, chunk in enumerate(chunks):
        # Use cleaned_text as the main content
        content = chunk.get('cleaned_text', chunk.get('raw_text', ''))
        if not content or len(content.strip()) == 0:
            continue  # Skip empty chunks
        
        documents.append(content)
        
        # Prepare metadata
        metadata = {
            'source_url': chunk.get('source_url', ''),
            'category': chunk.get('category', 'Product'),
            'section_type': chunk.get('section_type', 'product'),
            'page_title': chunk.get('page_title', ''),
            'chunk_length': chunk.get('metadata', {}).get('chunk_length', len(content)),
            'token_count': chunk.get('token_count', 0),
        }
        
        # Add headings if available
        if chunk.get('headings'):
            metadata['headings'] = ' | '.join(chunk['headings'])
        
        # Add contact info summary
        contact_info = chunk.get('contact_info', {})
        if contact_info:
            if contact_info.get('phones'):
                metadata['phone'] = contact_info['phones'][0]
            if contact_info.get('emails'):
                metadata['email'] = contact_info['emails'][0]
            if contact_info.get('addresses'):
                metadata['address'] = contact_info['addresses'][0]
        
        metadatas.append(metadata)
        ids.append(f"chunk_{idx}")
    
    logger.info(f"Prepared {len(documents)} documents for embedding")
    return documents, metadatas, ids


def build_vector_database():
    """Build the vector database from chunks."""
    # Check if chunks file exists
    chunks_path = Path(CHUNKS_FILE)
    if not chunks_path.exists():
        logger.error(f"Chunks file not found: {CHUNKS_FILE}")
        logger.error("Please make sure mtn_chunks.json is in the project root directory")
        logger.error("Run 'python convert_mtn_to_chunks.py' first to create the chunks file")
        return False
    
    # Load chunks
    try:
        chunks_data = load_chunks(str(chunks_path))
    except Exception as e:
        logger.error(f"Error loading chunks: {e}")
        return False
    
    # Prepare documents
    documents, metadatas, ids = prepare_documents(chunks_data)
    
    if len(documents) == 0:
        logger.error("No valid documents found in chunks file")
        return False
    
    # Initialize embedding model
    logger.info(f"Loading embedding model: {EMBEDDING_MODEL}")
    try:
        model = SentenceTransformer(EMBEDDING_MODEL)
    except Exception as e:
        logger.error(f"Error loading embedding model: {e}")
        return False
    
    # Create or clear database directory
    db_path = Path(DB_DIR)
    if db_path.exists():
        logger.warning(f"Database directory exists: {DB_DIR}")
        logger.info("Clearing existing database...")
        import shutil
        shutil.rmtree(db_path)
    
    db_path.mkdir(exist_ok=True)
    logger.info(f"Created database directory: {DB_DIR}")
    
    # Initialize ChromaDB
    logger.info("Initializing ChromaDB...")
    client = chromadb.PersistentClient(
        path=str(db_path),
        settings=Settings(anonymized_telemetry=False)
    )
    
    # Create or get collection
    collection = client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"}
    )
    
    # Generate embeddings and add to database
    logger.info("Generating embeddings...")
    batch_size = 32
    total_batches = (len(documents) + batch_size - 1) // batch_size
    
    for batch_idx in range(0, len(documents), batch_size):
        batch_docs = documents[batch_idx:batch_idx + batch_size]
        batch_metas = metadatas[batch_idx:batch_idx + batch_size]
        batch_ids = ids[batch_idx:batch_idx + batch_size]
        
        # Generate embeddings
        embeddings = model.encode(batch_docs, show_progress_bar=False)
        
        # Add to collection
        collection.add(
            embeddings=embeddings.tolist(),
            documents=batch_docs,
            metadatas=batch_metas,
            ids=batch_ids
        )
        
        current_batch = (batch_idx // batch_size) + 1
        logger.info(f"Processed batch {current_batch}/{total_batches} ({len(batch_docs)} documents)")
    
    # Verify
    count = collection.count()
    logger.info(f"Database built successfully!")
    logger.info(f"Total documents: {count}")
    logger.info(f"Database location: {db_path.absolute()}")
    
    return True


if __name__ == "__main__":
    print("\n" + "="*80)
    print("MTN VECTOR DATABASE BUILDER")
    print("="*80 + "\n")
    
    success = build_vector_database()
    
    if success:
        print("\n" + "="*80)
        print("Build completed successfully!")
        print("="*80 + "\n")
    else:
        print("\n" + "="*80)
        print("Build failed. Please check the errors above.")
        print("="*80 + "\n")
        exit(1)
