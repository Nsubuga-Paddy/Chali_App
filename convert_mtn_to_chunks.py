"""
Convert MTN Knowledge Base to Chunks for Vector Search

This script reads the MTN knowledge.json file and converts it into
semantic chunks suitable for vector database embedding.

Usage:
    python convert_mtn_to_chunks.py
"""

import json
import os
from pathlib import Path
from typing import List, Dict, Any
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
KNOWLEDGE_FILE = "public/knowledge-bases/mtn/knowledge.json"
OUTPUT_FILE = "mtn_chunks.json"
CHUNK_SIZE = 500  # Target chunk size in characters
CHUNK_OVERLAP = 50  # Overlap between chunks

def load_knowledge_base(file_path: str) -> Dict:
    """Load MTN knowledge base from JSON file."""
    logger.info(f"Loading knowledge base from: {file_path}")
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    logger.info(f"Loaded knowledge base: MTN Uganda")
    logger.info(f"Total products: {data.get('total_products', 0)}")
    return data

def extract_text_from_product(product: Dict) -> str:
    """Extract all searchable text from a product object."""
    text_parts = []
    
    # Product name
    if product.get('product_name'):
        text_parts.append(f"Product: {product['product_name']}")
    
    # Overview
    if product.get('overview'):
        text_parts.append(f"Overview: {product['overview']}")
    
    # Features
    if product.get('features'):
        features = product['features']
        if isinstance(features, list):
            for feature in features:
                if isinstance(feature, str) and feature.strip():
                    text_parts.append(f"Feature: {feature}")
        elif isinstance(features, str):
            text_parts.append(f"Features: {features}")
    
    # Pricing
    if product.get('pricing'):
        pricing = product['pricing']
        if isinstance(pricing, list):
            for price_info in pricing:
                if isinstance(price_info, str) and price_info.strip():
                    text_parts.append(f"Pricing: {price_info}")
        elif isinstance(pricing, str):
            text_parts.append(f"Pricing: {pricing}")
    
    # Cost
    if product.get('cost'):
        cost = product['cost']
        if isinstance(cost, list):
            cost_str = ', '.join([str(c) for c in cost if c])
            if cost_str:
                text_parts.append(f"Cost: {cost_str}")
        elif isinstance(cost, str):
            text_parts.append(f"Cost: {cost}")
    
    # Activation
    if product.get('activation'):
        activation = product['activation']
        if isinstance(activation, list):
            for act in activation:
                if isinstance(act, str) and act.strip():
                    text_parts.append(f"Activation: {act}")
        elif isinstance(activation, str):
            text_parts.append(f"Activation: {activation}")
    
    # Deactivation
    if product.get('deactivation'):
        deactivation = product['deactivation']
        if isinstance(deactivation, list):
            for deact in deactivation:
                if isinstance(deact, str) and deact.strip():
                    text_parts.append(f"Deactivation: {deact}")
        elif isinstance(deactivation, str):
            text_parts.append(f"Deactivation: {deactivation}")
    
    # USSD Codes
    if product.get('ussd_codes'):
        ussd_codes = product['ussd_codes']
        if isinstance(ussd_codes, list):
            codes_str = ', '.join([str(c) for c in ussd_codes if c])
            if codes_str:
                text_parts.append(f"USSD Codes: {codes_str}")
        elif isinstance(ussd_codes, str):
            text_parts.append(f"USSD Codes: {ussd_codes}")
    
    # How to use
    if product.get('how_to_use'):
        how_to_use = product['how_to_use']
        if isinstance(how_to_use, list):
            for instruction in how_to_use:
                if isinstance(instruction, str) and instruction.strip():
                    text_parts.append(f"How to use: {instruction}")
        elif isinstance(how_to_use, str):
            text_parts.append(f"How to use: {how_to_use}")
    
    # Validity
    if product.get('validity'):
        text_parts.append(f"Validity: {product['validity']}")
    
    # FAQs
    if product.get('faqs'):
        faqs = product['faqs']
        if isinstance(faqs, list):
            for faq in faqs:
                if isinstance(faq, dict):
                    question = faq.get('question', '')
                    answer = faq.get('answer', '')
                    if question and answer:
                        text_parts.append(f"Q: {question}")
                        text_parts.append(f"A: {answer}")
                elif isinstance(faq, str) and faq.strip():
                    text_parts.append(f"FAQ: {faq}")
    
    # Terms
    if product.get('terms'):
        text_parts.append(f"Terms: {product['terms']}")
    
    # Limitations
    if product.get('limitations'):
        text_parts.append(f"Limitations: {product['limitations']}")
    
    # Contact info
    if product.get('contact_info'):
        contact_info = product['contact_info']
        if isinstance(contact_info, str):
            text_parts.append(f"Contact: {contact_info}")
        elif isinstance(contact_info, dict):
            if contact_info.get('phone'):
                text_parts.append(f"Phone: {contact_info['phone']}")
            if contact_info.get('email'):
                text_parts.append(f"Email: {contact_info['email']}")
    
    # Troubleshooting
    if product.get('troubleshooting_guidance'):
        troubleshooting = product['troubleshooting_guidance']
        if isinstance(troubleshooting, list):
            for item in troubleshooting:
                if isinstance(item, str) and item.strip():
                    text_parts.append(f"Troubleshooting: {item}")
        elif isinstance(troubleshooting, str):
            text_parts.append(f"Troubleshooting: {troubleshooting}")
    
    return "\n".join(text_parts)

def create_chunks(text: str, source_url: str, product_name: str) -> List[Dict]:
    """Split text into chunks with metadata."""
    chunks = []
    
    # If text is short enough, create single chunk
    if len(text) <= CHUNK_SIZE:
        chunks.append({
            'raw_text': text,
            'cleaned_text': text.strip(),
            'source_url': source_url,
            'category': 'Product',
            'section_type': 'product',
            'page_title': product_name,
            'headings': [product_name] if product_name else [],
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
                    'category': 'Product',
                    'section_type': 'product',
                    'page_title': product_name,
                    'headings': [product_name] if product_name else [],
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
                'category': 'Product',
                'section_type': 'product',
                'page_title': product_name,
                'headings': [product_name] if product_name else [],
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
    chunks_by_category = {'Product': 0}
    
    # Process products
    products = kb_data.get('products', [])
    logger.info(f"Processing {len(products)} products")
    
    base_url = kb_data.get('base_url', 'https://www.mtn.co.ug/helppersonal/')
    
    for product in products:
        product_name = product.get('product_name', 'Unknown Product')
        source_url = product.get('source_url', base_url)
        
        # Extract text from product
        text = extract_text_from_product(product)
        
        if not text or len(text.strip()) == 0:
            logger.warning(f"Skipping empty product: {product_name}")
            continue
        
        # Create chunks
        product_chunks = create_chunks(text, source_url, product_name)
        all_chunks.extend(product_chunks)
        
        # Track by category
        chunks_by_category['Product'] += len(product_chunks)
        
        logger.info(f"Created {len(product_chunks)} chunks for: {product_name}")
    
    # Create output structure
    output = {
        'crawl_date': kb_data.get('crawl_date', ''),
        'source': 'MTN Uganda',
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
    print("MTN KNOWLEDGE BASE TO CHUNKS CONVERTER")
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
