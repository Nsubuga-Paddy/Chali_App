"""
Convert URA Knowledge Base to Chunks for Vector Search

This script reads the URA knowledge.json file and converts it into
semantic chunks suitable for vector database embedding.

Usage:
    python convert_ura_to_chunks.py
"""

import json
import os
from pathlib import Path
from typing import List, Dict, Any
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
KNOWLEDGE_FILE = "public/knowledge-bases/ura/knowledge.json"
OUTPUT_FILE = "ura_chunks.json"
CHUNK_SIZE = 500  # Target chunk size in characters
CHUNK_OVERLAP = 50  # Overlap between chunks

def load_knowledge_base(file_path: str) -> Dict:
    """Load URA knowledge base from JSON file."""
    logger.info(f"Loading knowledge base from: {file_path}")
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    logger.info(f"Loaded knowledge base: {data.get('source', 'URA')}")
    return data

def extract_text_from_service(service: Dict) -> str:
    """Extract all searchable text from a service object."""
    text_parts = []
    
    # Service name
    if service.get('service_name'):
        text_parts.append(f"Service: {service['service_name']}")
    
    # Category
    if service.get('category'):
        text_parts.append(f"Category: {service['category']}")
    
    # Sub services
    if service.get('sub_services'):
        sub_services = service['sub_services']
        if isinstance(sub_services, list):
            text_parts.append(f"Sub-services: {', '.join(sub_services)}")
        elif isinstance(sub_services, str):
            text_parts.append(f"Sub-services: {sub_services}")
    
    # Requirements
    if service.get('requirements'):
        requirements = service['requirements']
        if isinstance(requirements, list):
            for req in requirements:
                if isinstance(req, str) and req.strip():
                    text_parts.append(f"Requirement: {req}")
        elif isinstance(requirements, str):
            text_parts.append(f"Requirements: {requirements}")
    
    # Procedures
    if service.get('procedures'):
        procedures = service['procedures']
        if isinstance(procedures, list):
            for proc in procedures:
                if isinstance(proc, str) and proc.strip():
                    text_parts.append(proc)
        elif isinstance(procedures, str):
            text_parts.append(procedures)
    
    # Forms available
    if service.get('forms_available'):
        forms = service['forms_available']
        if isinstance(forms, list):
            text_parts.append(f"Available forms: {', '.join(forms)}")
        elif isinstance(forms, str):
            text_parts.append(f"Available forms: {forms}")
    
    # Contact info
    contact_info = service.get('contact_info', {})
    if contact_info:
        if contact_info.get('toll_free'):
            text_parts.append(f"Toll-free: {contact_info['toll_free']}")
        if contact_info.get('phone_numbers'):
            text_parts.append(f"Phone: {contact_info['phone_numbers']}")
        if contact_info.get('whatsapp'):
            text_parts.append(f"WhatsApp: {contact_info['whatsapp']}")
        if contact_info.get('email'):
            text_parts.append(f"Email: {contact_info['email']}")
    
    # Links (convert to text)
    if service.get('links'):
        links = service['links']
        if isinstance(links, dict):
            for link_name, link_url in links.items():
                text_parts.append(f"{link_name}: {link_url}")
    
    return "\n".join(text_parts)

def create_chunks(text: str, source_url: str, category: str, service_name: str) -> List[Dict]:
    """Split text into chunks with metadata."""
    chunks = []
    
    # If text is short enough, create single chunk
    if len(text) <= CHUNK_SIZE:
        chunks.append({
            'raw_text': text,
            'cleaned_text': text.strip(),
            'source_url': source_url,
            'category': category,
            'section_type': 'service',
            'page_title': service_name,
            'headings': [service_name] if service_name else [],
            'contact_info': {},
            'metadata': {
                'chunk_length': len(text),
                'is_complete': True
            },
            'token_count': len(text.split())  # Rough estimate
        })
    else:
        # Split into multiple chunks
        words = text.split()
        current_chunk = []
        current_length = 0
        
        for word in words:
            word_length = len(word) + 1  # +1 for space
            if current_length + word_length > CHUNK_SIZE and current_chunk:
                # Save current chunk
                chunk_text = ' '.join(current_chunk)
                chunks.append({
                    'raw_text': chunk_text,
                    'cleaned_text': chunk_text.strip(),
                    'source_url': source_url,
                    'category': category,
                    'section_type': 'service',
                    'page_title': service_name,
                    'headings': [service_name] if service_name else [],
                    'contact_info': {},
                    'metadata': {
                        'chunk_length': len(chunk_text),
                        'is_complete': False
                    },
                    'token_count': len(current_chunk)
                })
                
                # Start new chunk with overlap
                overlap_words = current_chunk[-CHUNK_OVERLAP:] if len(current_chunk) > CHUNK_OVERLAP else current_chunk
                current_chunk = overlap_words + [word]
                current_length = sum(len(w) + 1 for w in current_chunk)
            else:
                current_chunk.append(word)
                current_length += word_length
        
        # Add final chunk
        if current_chunk:
            chunk_text = ' '.join(current_chunk)
            chunks.append({
                'raw_text': chunk_text,
                'cleaned_text': chunk_text.strip(),
                'source_url': source_url,
                'category': category,
                'section_type': 'service',
                'page_title': service_name,
                'headings': [service_name] if service_name else [],
                'contact_info': {},
                'metadata': {
                    'chunk_length': len(chunk_text),
                    'is_complete': True
                },
                'token_count': len(current_chunk)
            })
    
    return chunks

def process_knowledge_base(kb_data: Dict) -> Dict:
    """Process knowledge base and create chunks."""
    all_chunks = []
    chunks_by_category = {}
    
    # Process global contact info
    global_contact = kb_data.get('global_contact_info', {})
    
    # Process services
    services = kb_data.get('services', [])
    logger.info(f"Processing {len(services)} services")
    
    for service in services:
        service_name = service.get('service_name', 'Unknown Service')
        category = service.get('category', 'General')
        source_url = service.get('source_url', kb_data.get('base_url', 'https://ura.go.ug/'))
        
        # Extract text from service
        text = extract_text_from_service(service)
        
        if not text or len(text.strip()) == 0:
            logger.warning(f"Skipping empty service: {service_name}")
            continue
        
        # Create chunks
        service_chunks = create_chunks(text, source_url, category, service_name)
        all_chunks.extend(service_chunks)
        
        # Track by category
        if category not in chunks_by_category:
            chunks_by_category[category] = 0
        chunks_by_category[category] += len(service_chunks)
        
        logger.info(f"Created {len(service_chunks)} chunks for: {service_name}")
    
    # Create output structure
    output = {
        'crawl_date': kb_data.get('crawl_date', ''),
        'source': kb_data.get('source', 'URA - Uganda Revenue Authority'),
        'total_chunks': len(all_chunks),
        'chunks_by_category': chunks_by_category,
        'chunks': all_chunks
    }
    
    logger.info(f"Total chunks created: {len(all_chunks)}")
    logger.info(f"Categories: {list(chunks_by_category.keys())}")
    
    return output

def main():
    """Main function."""
    print("\n" + "="*80)
    print("URA KNOWLEDGE BASE TO CHUNKS CONVERTER")
    print("="*80 + "\n")
    
    # Check if knowledge file exists
    kb_path = Path(KNOWLEDGE_FILE)
    if not kb_path.exists():
        logger.error(f"Knowledge base file not found: {KNOWLEDGE_FILE}")
        logger.error("Please make sure the file exists in the correct location")
        return False
    
    # Load knowledge base
    try:
        kb_data = load_knowledge_base(str(kb_path))
    except Exception as e:
        logger.error(f"Error loading knowledge base: {e}")
        return False
    
    # Process and create chunks
    try:
        chunks_data = process_knowledge_base(kb_data)
    except Exception as e:
        logger.error(f"Error processing knowledge base: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # Save chunks to file
    output_path = Path(OUTPUT_FILE)
    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(chunks_data, f, indent=2, ensure_ascii=False)
        logger.info(f"Chunks saved to: {output_path.absolute()}")
    except Exception as e:
        logger.error(f"Error saving chunks file: {e}")
        return False
    
    print("\n" + "="*80)
    print("Conversion completed successfully!")
    print(f"Output file: {OUTPUT_FILE}")
    print(f"Total chunks: {chunks_data['total_chunks']}")
    print("="*80 + "\n")
    
    return True

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)

