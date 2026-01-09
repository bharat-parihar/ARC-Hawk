"""
Auto-ingestion module for Hawk Scanner
Handles automatic POST of scan results to backend API with retry logic.

UPDATED: Now uses /ingest-verified endpoint with VerifiedFinding schema.
Intelligence-at-Edge: Scanner sends ONLY validated findings.
"""

import requests
import time
import json
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


def create_retry_session(retries=3, backoff_factor=0.5, status_forcelist=(500, 502, 503, 504)):
    """
    Create a requests session with automated retry logic
    
    Args:
        retries: Maximum number of retries
        backoff_factor: Exponential backoff multiplier
        status_forcelist: HTTP status codes to retry on
    
    Returns:
        requests.Session with retry configuration
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
    
    Intelligence-at-Edge: Scanner sends ONLY validated findings.
    Backend trusts scanner and does NOT re-validate.
    
    Args:
        args: Command line arguments (must contain ingest_url)
        verified_findings: List of VerifiedFinding objects (already validated)
        scan_metadata: Optional metadata about the scan
    
    Returns:
        bool: True if ingestion succeeded, False otherwise
    """
    if not hasattr(args, 'ingest_url') or not args.ingest_url:
        return False
    
    # Import here to avoid circular dependency
    from hawk_scanner.internals import system
    
    # Use /ingest-verified endpoint
    base_url = args.ingest_url.rstrip('/ingest').rstrip('/api/v1/scans')
    ingest_url = f"{base_url}/api/v1/scans/ingest-verified"
    
    system.print_info(args, f"🚀 Auto-ingesting VERIFIED findings to {ingest_url}")
    
    # Convert VerifiedFinding objects to dicts
    findings_dicts = [finding.to_dict() for finding in verified_findings]
    
    # Prepare payload with VerifiedFinding schema
    payload = {
        "scan_metadata": scan_metadata or {
            "scanner_version": "hawk-eye-scanner-2.0-sdk",
            "scan_timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "intelligence_at_edge": True,  # Mark as Intelligence-at-Edge
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
        system.print_info(args, "   (Backend will NOT re-validate - Intelligence-at-Edge)")
        
        response = session.post(
            ingest_url,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=timeout
        )
        
        if response.status_code in [200, 201]:
            system.print_success(args, f"✅ Successfully ingested {len(findings_dicts)} verified findings!")
            try:
                resp_data = response.json()
                system.print_info(args, f"Response: {resp_data}")
            except:
                pass
            return True
        else:
            system.print_error(args, f"❌ Ingestion failed with status {response.status_code}: {response.text}")
            return False
            
    except requests.exceptions.Timeout:
        system.print_error(args, f"❌ Ingestion timed out after {timeout} seconds")
        return False
    except requests.exceptions.ConnectionError as e:
        system.print_error(args, f"❌ Connection error: {e}")
        system.print_info(args, "Hint: Ensure the backend is running and the URL is correct")
        return False
    except requests.exceptions.RequestException as e:
        system.print_error(args, f"❌ Ingestion failed: {e}")
        return False
    except Exception as e:
        system.print_error(args, f"❌ Unexpected error during ingestion: {e}")
        return False
    finally:
        session.close()


# Legacy function for backward compatibility
def ingest_scan_results(args, grouped_results, scan_metadata=None):
    """
    DEPRECATED: Use ingest_verified_findings() instead.
    
    This function is kept for backward compatibility but should not be used.
    The new Intelligence-at-Edge architecture requires VerifiedFinding objects.
    """
    from hawk_scanner.internals import system
    system.print_error(args, "⚠️  WARNING: Using deprecated ingest_scan_results()")
    system.print_info(args, "   Please update to ingest_verified_findings() with VerifiedFinding objects")
    return False


def validate_ingest_url(url):
    """
    Validate that the ingestion URL is properly formatted
    
    Args:
        url: URL to validate
    
    Returns:
        bool: True if valid, False otherwise
    """
    if not url:
        return False
    
    # Basic URL validation
    if not url.startswith(('http://', 'https://')):
        return False
    
    # Should end with /ingest-verified (new) or /ingest (legacy)
    valid_endpoints = ['/ingest-verified', '/ingest', '/api/v1/scans/ingest-verified', '/api/v1/scans/ingest']
    return any(url.endswith(endpoint) for endpoint in valid_endpoints)
