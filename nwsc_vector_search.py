"""
NWSC Vector Search Module for Chali_App

Easy-to-use module for searching the NWSC customer service knowledge base.

Usage:
    from nwsc_vector_search import NWSCVectorSearch
    
    searcher = NWSCVectorSearch()
    results = searcher.search("How do I apply for a new water connection?")
"""

import os
from pathlib import Path
from typing import List, Dict, Optional
import logging

try:
    import chromadb
    from chromadb.config import Settings
    from sentence_transformers import SentenceTransformer
except ImportError:
    raise ImportError(
        "Missing required packages. Please install: pip install chromadb sentence-transformers"
    )

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
EMBEDDING_MODEL = "all-MiniLM-L6-v2"  # Same as MTN and UEDCL for consistency
COLLECTION_NAME = "nwsc_customer_service"


class NWSCVectorSearch:
    """
    Simple interface for searching NWSC customer service knowledge base.
    
    Usage:
        searcher = NWSCVectorSearch()
        results = searcher.search("How do I apply for a new water connection?")
    """
    
    def __init__(
        self,
        db_path: Optional[str] = None,
        collection_name: str = COLLECTION_NAME
    ):
        """
        Initialize the vector search.
        
        Args:
            db_path: Path to vector database directory. 
                    If None, tries to find it automatically.
            collection_name: Name of the collection in the database.
        """
        # Auto-detect database path
        if db_path is None:
            db_path = self._find_database_path()
        
        if not db_path or not Path(db_path).exists():
            raise FileNotFoundError(
                f"Vector database not found at {db_path}. "
                f"Please run build_nwsc_vector_db.py first to create the database."
            )
        
        logger.info(f"Loading vector database from: {db_path}")
        
        # Initialize ChromaDB client
        self.client = chromadb.PersistentClient(
            path=db_path,
            settings=Settings(anonymized_telemetry=False)
        )
        
        # Get collection
        try:
            self.collection = self.client.get_collection(name=collection_name)
        except Exception as e:
            raise FileNotFoundError(
                f"Collection '{collection_name}' not found in database. "
                f"Please run build_nwsc_vector_db.py first."
            )
        
        # Initialize embedding generator
        logger.info(f"Loading embedding model: {EMBEDDING_MODEL}")
        self.embedding_model = SentenceTransformer(EMBEDDING_MODEL)
        
        logger.info("NWSC Vector Search initialized successfully")
    
    def _find_database_path(self) -> Optional[str]:
        """
        Try to find the vector database path automatically.
        Checks common locations relative to this file.
        """
        current_dir = Path(__file__).parent
        possible_paths = [
            current_dir / "nwsc_vector_db",  # Same directory as this file
            current_dir.parent / "nwsc_vector_db",  # Parent directory
            Path(r"D:\BACK UP 1\Personal\Voice Agent\Chali_App\nwsc_vector_db"),  # Chali_App
        ]
        
        for path in possible_paths:
            if path.exists() and path.is_dir():
                logger.info(f"Found database at: {path}")
                return str(path)
        
        return None
    
    def search(
        self,
        query: str,
        n_results: int = 5,
        min_score: float = 0.0
    ) -> List[Dict]:
        """
        Search the knowledge base for relevant information.
        
        Args:
            query: The search query/question
            n_results: Number of results to return (default: 5)
            min_score: Minimum similarity score (0.0 to 1.0, default: 0.0)
        
        Returns:
            List of dictionaries with 'content', 'metadata', and 'score' keys
        """
        if not query or not query.strip():
            return []
        
        # Generate query embedding
        query_embedding = self.embedding_model.encode(
            query,
            show_progress_bar=False
        ).tolist()
        
        # Search the collection
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results,
            include=['documents', 'metadatas', 'distances']
        )
        
        # Format results
        formatted_results = []
        
        if results['documents'] and len(results['documents'][0]) > 0:
            for i, (doc, metadata, distance) in enumerate(zip(
                results['documents'][0],
                results['metadatas'][0],
                results['distances'][0]
            )):
                # Convert distance to similarity score (cosine distance -> similarity)
                # Cosine distance: 0 = identical, 2 = opposite
                # Similarity: 1 - (distance / 2)
                similarity = 1.0 - (distance / 2.0)
                
                if similarity >= min_score:
                    formatted_results.append({
                        'content': doc,
                        'metadata': metadata,
                        'score': similarity,
                        'distance': distance
                    })
        
        logger.info(f"Found {len(formatted_results)} results for query: {query[:50]}...")
        
        return formatted_results
    
    def get_collection_info(self) -> Dict:
        """Get information about the collection."""
        count = self.collection.count()
        return {
            'collection_name': COLLECTION_NAME,
            'total_documents': count,
            'embedding_model': EMBEDDING_MODEL
        }


# Command-line interface for testing
if __name__ == "__main__":
    import sys
    
    print("\n" + "="*80)
    print("NWSC VECTOR SEARCH - TEST MODE")
    print("="*80 + "\n")
    
    try:
        searcher = NWSCVectorSearch()
        
        # Show collection info
        info = searcher.get_collection_info()
        print(f"Collection: {info['collection_name']}")
        print(f"Total documents: {info['total_documents']}")
        print(f"Embedding model: {info['embedding_model']}")
        print()
        
        # Test queries
        test_queries = [
            "How do I apply for a new water connection?",
            "What are the payment options?",
            "How much does it cost to get connected?",
            "How do I report a water quality issue?",
        ]
        
        if len(sys.argv) > 1:
            # Use command-line query
            query = ' '.join(sys.argv[1:])
            test_queries = [query]
        
        for query in test_queries:
            print(f"Query: {query}")
            print("-" * 80)
            
            results = searcher.search(query, n_results=3)
            
            if results:
                for i, result in enumerate(results, 1):
                    print(f"\nResult {i} (Score: {result['score']:.3f}):")
                    print(f"  Content: {result['content'][:200]}...")
                    if result['metadata']:
                        print(f"  Category: {result['metadata'].get('category', 'N/A')}")
                        print(f"  Source: {result['metadata'].get('source_url', 'N/A')}")
            else:
                print("  No results found.")
            
            print("\n" + "="*80 + "\n")
    
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

