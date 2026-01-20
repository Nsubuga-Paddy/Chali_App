"""
MTN Vector Search Module for Chali_App

Easy-to-use module for searching the MTN customer service knowledge base.
Copy this file to your Chali_App directory and use it like:

    from mtn_vector_search import MTNVectorSearch
    
    searcher = MTNVectorSearch()
    results = searcher.search("How do I activate MoMo?")
"""

import os
from pathlib import Path
from typing import List, Dict, Optional
import logging

# Try to import required packages
try:
    from embedding_pipeline import ChromaVectorDB, EmbeddingGenerator, EmbeddingConfig
except ImportError:
    # If embedding_pipeline is not in the same directory, try to find it
    import sys
    # Try parent directory (mtn-customer-data)
    parent_dir = Path(__file__).parent.parent
    possible_paths = [
        parent_dir,  # Parent directory
        Path(r"D:\BACK UP 1\Personal\Voice Agent\mtn-customer-data"),  # Original location
        Path(__file__).parent,  # Same directory
    ]
    
    for path in possible_paths:
        if (path / "embedding_pipeline.py").exists():
            sys.path.insert(0, str(path))
            break
    
    try:
        from embedding_pipeline import ChromaVectorDB, EmbeddingGenerator, EmbeddingConfig
    except ImportError:
        raise ImportError(
            "Could not find embedding_pipeline.py. "
            "Make sure it's in the same directory or in the Python path."
        )

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class MTNVectorSearch:
    """
    Simple interface for searching MTN customer service knowledge base.
    
    Usage:
        searcher = MTNVectorSearch()
        results = searcher.search("How do I activate MoMo?")
    """
    
    def __init__(
        self,
        db_path: Optional[str] = None,
        collection_name: str = "mtn_customer_service"
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
                f"Please run build_db_for_app.py first to create the database."
            )
        
        logger.info(f"Loading vector database from: {db_path}")
        
        # Initialize components
        self.vector_db = ChromaVectorDB(
            collection_name=collection_name,
            persist_directory=db_path
        )
        
        # Initialize embedding generator (reuse same config as when building)
        self.embedding_config = EmbeddingConfig(
            model_type="sentence-transformers",
            model_name="all-MiniLM-L6-v2"
        )
        self.embedding_generator = EmbeddingGenerator(self.embedding_config)
        
        logger.info("MTN Vector Search initialized successfully")
    
    def _find_database_path(self) -> Optional[str]:
        """
        Try to find the vector database path automatically.
        Checks common locations relative to this file.
        """
        # Check if we're in Chali_App directory
        current_dir = Path(__file__).parent
        possible_paths = [
            current_dir / "mtn_vector_db",  # Same directory as this file
            current_dir.parent / "mtn_vector_db",  # Parent directory
            Path(r"D:\BACK UP 1\Personal\Voice Agent\Chali_App\mtn_vector_db"),  # Chali_App
            Path(r"D:\BACK UP 1\Personal\Voice Agent\mtn-customer-data\mtn_vector_db"),  # Original location
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
            category_filter: Filter by category (e.g., "MoMo", "MTN WakaNet")
            min_score: Minimum similarity score (0-1, lower = more similar)
        
        Returns:
            List of dictionaries with:
            - content: The text content
            - metadata: Category, topic, type, source_url
            - score: Similarity score (lower = more similar)
        """
        logger.info(f"Searching for: '{query}'")
        
        # Prepare filter
        filter_metadata = {"category": category_filter} if category_filter else None
        
        # Search
        results = self.vector_db.search(
            query=query,
            embedding_generator=self.embedding_generator,
            n_results=n_results,
            filter_metadata=filter_metadata
        )
        
        # Filter by minimum score if specified
        if min_score is not None:
            results = [r for r in results if r['score'] <= min_score]
        
        logger.info(f"Found {len(results)} results")
        return results
    
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
            context_parts.append(
                f"[Source {i}] {metadata.get('topic', 'Unknown')} "
                f"({metadata.get('category', 'Unknown')})\n"
                f"{result['content']}\n"
            )
        
        return "\n".join(context_parts)
    
    def get_stats(self) -> Dict:
        """
        Get statistics about the database.
        
        Returns:
            Dictionary with database statistics
        """
        count = self.vector_db.collection.count()
        return {
            "total_chunks": count,
            "database_path": self.vector_db.collection.name
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
    searcher = MTNVectorSearch()
    return searcher.search(query, n_results=n_results)


if __name__ == "__main__":
    """
    Test the module
    """
    print("\n" + "="*80)
    print("MTN VECTOR SEARCH - TEST")
    print("="*80)
    
    try:
        searcher = MTNVectorSearch()
        
        print(f"\n✅ Database loaded successfully!")
        stats = searcher.get_stats()
        print(f"📊 Total chunks: {stats['total_chunks']}")
        
        # Test queries
        test_queries = [
            "How do I activate MTN MoMo?",
            "What is the cost of WakaNet?",
            "USSD code for checking data balance"
        ]
        
        for query in test_queries:
            print(f"\n{'='*80}")
            print(f"🔍 Query: {query}")
            print('='*80)
            
            results = searcher.search(query, n_results=3)
            
            for i, result in enumerate(results, 1):
                print(f"\n📄 Result {i} (Score: {result['score']:.4f})")
                print(f"   Category: {result['metadata']['category']}")
                print(f"   Topic: {result['metadata']['topic']}")
                print(f"   Type: {result['metadata']['type']}")
                print(f"   Content: {result['content'][:200]}...")
        
        print("\n" + "="*80)
        print("✅ All tests passed!")
        print("="*80 + "\n")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("\nMake sure you've run build_db_for_app.py first!")
        import traceback
        traceback.print_exc()

