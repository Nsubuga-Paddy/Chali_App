"""
UEDCL Vector Search Module for Chali_App

Easy-to-use module for searching the UEDCL customer service knowledge base.

Usage:
    from uedcl_vector_search import UEDCLVectorSearch
    
    searcher = UEDCLVectorSearch()
    results = searcher.search("How do I report an outage?")
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
EMBEDDING_MODEL = "all-MiniLM-L6-v2"  # Same as MTN for consistency
COLLECTION_NAME = "uedcl_customer_service"


class UEDCLVectorSearch:
    """
    Simple interface for searching UEDCL customer service knowledge base.
    
    Usage:
        searcher = UEDCLVectorSearch()
        results = searcher.search("How do I report an outage?")
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
                f"Please run build_uedcl_vector_db.py first to create the database."
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
                f"Please run build_uedcl_vector_db.py first."
            )
        
        # Initialize embedding generator
        logger.info(f"Loading embedding model: {EMBEDDING_MODEL}")
        self.embedding_model = SentenceTransformer(EMBEDDING_MODEL)
        
        logger.info("UEDCL Vector Search initialized successfully")
    
    def _find_database_path(self) -> Optional[str]:
        """
        Try to find the vector database path automatically.
        Checks common locations relative to this file.
        """
        current_dir = Path(__file__).parent
        possible_paths = [
            current_dir / "uedcl_vector_db",  # Same directory as this file
            current_dir.parent / "uedcl_vector_db",  # Parent directory
            Path(r"D:\BACK UP 1\Personal\Voice Agent\Chali_App\uedcl_vector_db"),  # Chali_App
        ]
        
        for path in possible_paths:
            if path.exists():
                logger.info(f"Found database at: {path}")
                return str(path)
        
        return None
    
    def search(
        self,
        query: str,
        n_results: int = 5,
        category_filter: Optional[str] = None,
        min_score: Optional[float] = None
    ) -> List[Dict]:
        """
        Search the knowledge base.
        
        Args:
            query: User's question or search query
            n_results: Number of results to return (default: 5)
            category_filter: Filter by category (e.g., "outage", "faq")
            min_score: Maximum distance score (lower = more similar, typically 0-2)
        
        Returns:
            List of dictionaries with:
            - content: The text content
            - metadata: Category, source_url, page_title, etc.
            - score: Distance score (lower = more similar)
        """
        logger.info(f"Searching for: '{query}'")
        
        # Generate query embedding
        query_embedding = self.embedding_model.encode(query).tolist()
        
        # Prepare filter
        where_filter = None
        if category_filter:
            where_filter = {"category": category_filter}
        
        # Search
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results,
            where=where_filter
        )
        
        # Format results
        formatted_results = []
        if results['ids'] and len(results['ids'][0]) > 0:
            for i in range(len(results['ids'][0])):
                result = {
                    'content': results['documents'][0][i],
                    'metadata': results['metadatas'][0][i],
                    'score': results['distances'][0][i] if 'distances' in results else 0.0
                }
                
                # Apply minimum score filter if specified
                if min_score is None or result['score'] <= min_score:
                    formatted_results.append(result)
        
        logger.info(f"Found {len(formatted_results)} results")
        return formatted_results
    
    def search_simple(
        self,
        query: str,
        n_results: int = 3
    ) -> List[str]:
        """
        Simple search that returns just the content strings.
        
        Args:
            query: User's question
            n_results: Number of results
        
        Returns:
            List of content strings
        """
        results = self.search(query, n_results=n_results)
        return [r['content'] for r in results]
    
    def get_answer_context(
        self,
        query: str,
        n_results: int = 5
    ) -> str:
        """
        Get formatted context string for LLM.
        
        Args:
            query: User's question
            n_results: Number of results to include
        
        Returns:
            Formatted string with all relevant context
        """
        results = self.search(query, n_results=n_results)
        
        if not results:
            return "No relevant information found."
        
        context_parts = []
        for i, result in enumerate(results, 1):
            metadata = result['metadata']
            category = metadata.get('category', 'general')
            page_title = metadata.get('page_title', 'Unknown')
            
            context_parts.append(
                f"[Source {i}] {page_title} ({category})\n"
                f"{result['content']}\n"
            )
        
        return "\n".join(context_parts)
    
    def get_stats(self) -> Dict:
        """
        Get statistics about the database.
        
        Returns:
            Dictionary with database statistics
        """
        count = self.collection.count()
        return {
            "total_chunks": count,
            "collection_name": self.collection.name
        }


# Convenience function for quick usage
def quick_search(query: str, n_results: int = 5) -> List[Dict]:
    """
    Quick search function - initializes and searches in one call.
    
    Args:
        query: Search query
        n_results: Number of results
    
    Returns:
        List of search results
    """
    searcher = UEDCLVectorSearch()
    return searcher.search(query, n_results=n_results)


if __name__ == "__main__":
    """
    Test the module
    """
    print("\n" + "="*80)
    print("UEDCL VECTOR SEARCH - TEST")
    print("="*80)
    
    try:
        searcher = UEDCLVectorSearch()
        
        print(f"\nDatabase loaded successfully!")
        stats = searcher.get_stats()
        print(f"Total chunks: {stats['total_chunks']}")
        
        # Test queries
        test_queries = [
            "How do I report an outage?",
            "What is the contact information?",
            "How do I get an electricity connection?"
        ]
        
        for query in test_queries:
            print(f"\n{'='*80}")
            print(f"Query: {query}")
            print('='*80)
            
            results = searcher.search(query, n_results=3)
            
            for i, result in enumerate(results, 1):
                print(f"\nResult {i} (Score: {result['score']:.4f})")
                print(f"   Category: {result['metadata'].get('category', 'N/A')}")
                print(f"   Page: {result['metadata'].get('page_title', 'N/A')[:60]}")
                print(f"   Content: {result['content'][:200]}...")
        
        print("\n" + "="*80)
        print("All tests passed!")
        print("="*80 + "\n")
        
    except Exception as e:
        print(f"\nError: {e}")
        print("\nMake sure you've run build_uedcl_vector_db.py first!")
        import traceback
        traceback.print_exc()

