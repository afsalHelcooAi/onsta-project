import unittest
from app.services.ai_gateway import AIGatewayService
from app.schemas.ai_extraction import (
    TradeLicenseExtraction,
    FacilityLicenseExtraction,
    AdvertisingPermitExtraction
)

class TestAIExtractionCrossCheck(unittest.TestCase):
    def setUp(self):
        self.gateway = AIGatewayService()

    def test_matching_documents_pass_with_high_confidence(self):
        trade = TradeLicenseExtraction(
            legal_name="Al Noor Medical Clinic LLC",
            trade_name="Al Noor Clinic",
            license_number="123456",
            issue_date="2023-01-01",
            expiry_date="2028-01-01",
            confidence_score=0.98
        )
        facility = FacilityLicenseExtraction(
            facility_name="Al Noor Medical Clinic",
            facility_license_number="DHA-F-0012345",
            expiry_date="2028-01-01",
            medical_director_name="Dr. Fatima Al Mansoori",
            medical_director_license_number="DHA-P-004321",
            confidence_score=0.97
        )
        ad = AdvertisingPermitExtraction(
            mohap_permit_number="MOHAP-ADV-2024-8831",
            expiry_date="2028-01-01",
            confidence_score=0.96
        )

        res = self.gateway.cross_validate(trade, facility, ad)
        self.assertTrue(res.legal_name_match)
        self.assertTrue(res.director_found)
        self.assertFalse(res.is_expired)
        self.assertEqual(len(res.flags), 0)
        self.assertGreaterEqual(res.overall_confidence, 0.95)

    def test_mismatched_company_names_flagged(self):
        trade = TradeLicenseExtraction(
            legal_name="Apex Healthcare Group LLC",
            license_number="999888",
            issue_date="2023-01-01",
            expiry_date="2028-01-01"
        )
        facility = FacilityLicenseExtraction(
            facility_name="Sunshine Dental Clinic",
            facility_license_number="DHA-F-99999",
            expiry_date="2028-01-01",
            medical_director_name="Dr. Smith",
            medical_director_license_number="DHA-P-1111"
        )
        ad = AdvertisingPermitExtraction(
            mohap_permit_number="MOHAP-ADV-2024-0000",
            expiry_date="2028-01-01"
        )

        res = self.gateway.cross_validate(trade, facility, ad)
        self.assertFalse(res.legal_name_match)
        self.assertTrue(any("Mismatched Names" in f for f in res.flags))
        self.assertLess(res.overall_confidence, 0.90)

    def test_expired_trade_license_flagged(self):
        trade = TradeLicenseExtraction(
            legal_name="Al Noor Medical Clinic LLC",
            license_number="123456",
            issue_date="2020-01-01",
            expiry_date="2022-01-01" # Already expired
        )
        facility = FacilityLicenseExtraction(
            facility_name="Al Noor Medical Clinic",
            facility_license_number="DHA-F-0012345",
            expiry_date="2028-01-01",
            medical_director_name="Dr. Fatima Al Mansoori",
            medical_director_license_number="DHA-P-004321"
        )
        ad = AdvertisingPermitExtraction(
            mohap_permit_number="MOHAP-ADV-2024-8831",
            expiry_date="2028-01-01"
        )

        res = self.gateway.cross_validate(trade, facility, ad)
        self.assertTrue(res.is_expired)
        self.assertTrue(any("expired" in f.lower() for f in res.flags))

    def test_missing_medical_director_flagged(self):
        trade = TradeLicenseExtraction(
            legal_name="Al Noor Medical Clinic LLC",
            license_number="123456",
            issue_date="2023-01-01",
            expiry_date="2028-01-01"
        )
        facility = FacilityLicenseExtraction(
            facility_name="Al Noor Medical Clinic",
            facility_license_number="DHA-F-0012345",
            expiry_date="2028-01-01",
            medical_director_name=None, # Missing director
            medical_director_license_number=None
        )
        ad = AdvertisingPermitExtraction(
            mohap_permit_number="MOHAP-ADV-2024-8831",
            expiry_date="2028-01-01"
        )

        res = self.gateway.cross_validate(trade, facility, ad)
        self.assertFalse(res.director_found)
        self.assertTrue(any("Medical Director" in f for f in res.flags))

if __name__ == "__main__":
    unittest.main()
