"""
Auto-ingestion module for Hawk Scanner
Handles automatic POST of scan results to backend API with retry logic.

UPDATED: Now uses /ingest-verified endpoint with VerifiedFinding schema.
Intelligence-at-Edge: Scanner sends ONLY validated findings.
"""

import requests
import time
import json
import hashlib
from datetime import datetime
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from typing import List, Dict, Any

# Try to import SDK schema, but handle case where SDK might not be in path
try:
    from sdk.schema import VerifiedFinding, SourceInfo
except ImportError:
    # Fallback / Placeholder if running standalone without SDK
    class SourceInfo:
        def __init__(self, **kwargs):
            self.__dict__.update(kwargs)
    
    class VerifiedFinding:
        def __init__(self, **kwargs):
            self.__dict__.update(kwargs)
        
        def to_dict(self):
            return self.__dict__


def create_retry_session(retries=3, backoff_factor=0.5, status_forcelist=(500, 502, 503, 504)):
    """
    Create a requests session with automated retry logic
    """
    session = requests.Session()
    
    retry = Retry(
        total=retries,
        read=retries,
        connect=retries,
        backoff_factor=backoff_factor,
        status_forcelist=status_forcelist,
        allowed_methods=["POST"]  # Only retry POST requests
    )
    
    adapter = HTTPAdapter(max_retries=retry)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    
    return session


def ingest_verified_findings(args, verified_findings, scan_metadata=None):
    """
    POST verified findings to backend /ingest-verified API.
    """
    if not hasattr(args, 'ingest_url') or not args.ingest_url:
        return False
    
    from hawk_scanner.internals import system
    
    # Use /ingest-verified endpoint
    base_url = args.ingest_url.rstrip('/ingest').rstrip('/api/v1/scans').rstrip('/ingest-verified')
    ingest_url = f"{base_url}/api/v1/scans/ingest-verified"
    
    system.print_info(args, f"🚀 Auto-ingesting VERIFIED findings to {ingest_url}")
    
    # Convert VerifiedFinding objects to dicts if they are objects
    findings_dicts = []
    for f in verified_findings:
        if hasattr(f, 'to_dict'):
            findings_dicts.append(f.to_dict())
        elif isinstance(f, dict):
            findings_dicts.append(f)
        else:
            findings_dicts.append(f.__dict__)
    
    # Prepare payload with VerifiedFinding schema
    payload = {
        "scan_metadata": scan_metadata or {
            "scanner_version": "hawk-eye-scanner-2.0-cli",
            "scan_timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "intelligence_at_edge": True,
            "sdk_validated": True,
        },
        "verified_findings": findings_dicts,
        "total_findings": len(findings_dicts)
    }
    
    # Create session with retry logic
    retries = args.ingest_retry if hasattr(args, 'ingest_retry') else 3
    timeout = args.ingest_timeout if hasattr(args, 'ingest_timeout') else 30
    
    session = create_retry_session(retries=retries)
    
    try:
        system.print_info(args, f"⏳ Sending {len(findings_dicts)} VERIFIED findings to backend...")
        
        response = session.post(
            ingest_url,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=timeout
        )
        
        if response.status_code in [200, 201]:
            system.print_success(args, f"✅ Successfully ingested {len(findings_dicts)} verified findings!")
            return True
        else:
            system.print_error(args, f"❌ Ingestion failed with status {response.status_code}: {response.text}")
            return False
            
    except requests.exceptions.Timeout:
        system.print_error(args, f"❌ Ingestion timed out after {timeout} seconds")
        return False
    except requests.exceptions.ConnectionError as e:
        system.print_error(args, f"❌ Connection error: {e}")
        return False
    except Exception as e:
        system.print_error(args, f"❌ Unexpected error during ingestion: {e}")
        return False
    finally:
        session.close()


def ingest_scan_results(args, grouped_results, scan_metadata=None):
    """
    Adapter for legacy scan results format -> VerifiedFinding format.
    Allows CLI to work with new backend endpoint.
    """
    from hawk_scanner.internals import system
    system.print_info(args, "🔄 Converting legacy scan results to Verified Findings format...")

    verified_findings = []
    
    for group, findings in grouped_results.items():
        for result in findings:
            # Map legacy result to VerifiedFinding
            
            # Determine SourceInfo
            source_info = {
                "data_source": group,
                "host": result.get('host', 'localhost'),
                "path": result.get('file_path') or result.get('file_name') or 'unknown',
                "table": result.get('table'),
                "column": result.get('column'),
                "line": None # Legacy doesn't capture line number
            }
            
            pattern_name = result.get('pattern_name', 'Unknown')
            pii_type_map = {
                "Aadhar": "IN_AADHAAR",
                "PAN": "IN_PAN",
                "Email": "EMAIL_ADDRESS",
                "Phone": "PHONE_NUMBER",
                "Credit Card": "CREDIT_CARD"
            }
            # Try to map pattern name to PII Type, else uppercase it
            pii_type = pii_type_map.get(pattern_name, pattern_name.upper().replace(" ", "_"))
            
            for match_value in result.get('matches', []):
                # Hash match
                match_hash = hashlib.sha256(str(match_value).encode()).hexdigest()
                
                # Create finding dict (manual since we might not have SDK loaded)
                vf = {
                    "pii_type": pii_type,
                    "value_hash": match_hash,
                    "source": source_info,
                    "validators_passed": ["regex"], # Assume regex passed
                    "validation_method": "regex",
                    "ml_confidence": 0.8,
                    "ml_entity_type": pii_type,
                    "context_excerpt": result.get('sample_text', '')[:100] if result.get('sample_text') else "",
                    "context_keywords": [],
                    "pattern_name": pattern_name,
                    "detected_at": datetime.utcnow().isoformat() + "Z",
                    "scanner_version": "hawk-scanner-cli-legacy-adapter"
                }
                verified_findings.append(vf)

    return ingest_verified_findings(args, verified_findings, scan_metadata)


def validate_ingest_url(url):
    """
    Validate that the ingestion URL is properly formatted
    """
    if not url:
        return False
    
    if not url.startswith(('http://', 'https://')):
        return False
    
    return True
