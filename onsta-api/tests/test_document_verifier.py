import unittest
from app.services.document_verifier import (
    classify_document,
    verify_document_for_target,
    extract_doctor_license_verified,
    RULESETS,
)


class TestDocumentVerifier(unittest.TestCase):

    def setUp(self):
        self.sample_dha_doctor = """
        DUBAI HEALTH AUTHORITY
        HEALTHCARE PROFESSIONAL LICENSING
        Practitioner Name: Dr. Sarah Al Mansoori
        Title: Consultant Dermatologist & Laser Surgeon
        Category: Dermatology & Aesthetic Medicine
        License Number: DHA-P-0091823
        Issue Date: 15/05/2024
        Expiry Date: 2029-05-15
        Status: Active
        """

        self.sample_doh_doctor = """
        ABU DHABI DEPARTMENT OF HEALTH
        PROFESSIONAL MEDICAL PRACTICE PERMIT
        Name of Professional: Dr. Marcus Vance
        Title: Specialist Plastic Surgeon
        Field: Plastic & Reconstructive Surgery
        License No: DOH-P-771234
        Valid To: 2028-11-20
        """

        self.sample_mohap_advertising = """
        UNITED ARAB EMIRATES
        MINISTRY OF HEALTH & PREVENTION
        HEALTH ADVERTISEMENT APPROVAL
        Permit Number: MOHAP-ADV-2024-8831
        Advertisement Type: Digital & Social Media
        Institution Name: Al Noor Medical Clinic LLC
        Approved Channels: Website, Instagram, ONSTA Partner Listing
        Start Date: 2024-01-01
        Expiry Date: 2027-12-31
        """

        self.sample_trade_license = """
        GOVERNMENT OF DUBAI
        DEPARTMENT OF ECONOMY AND TOURISM
        COMMERCIAL LICENSE
        License No: 789123
        Licensee Name: AL NOOR MEDICAL CLINIC LLC
        Trade Name: AL NOOR AESTHETICS
        Legal Form: Limited Liability Company
        Issue Date: 2022-01-10
        Expiry Date: 2027-01-09
        Register No: 1102938
        """

        self.sample_facility_license = """
        DUBAI HEALTH AUTHORITY
        HEALTHCARE FACILITY LICENSE
        Facility License No: DHA-F-0012345
        Facility Name: Al Noor Medical Clinic
        Facility Type: Polyclinic
        Medical Director: Dr. Fatima Al Mansoori
        Issue Date: 2023-12-25
        Expiry Date: 2026-12-25
        Linked Trade License: 789123
        """

    def test_classify_doctor_license(self):
        doc_type, conf, scores = classify_document(self.sample_dha_doctor)
        self.assertEqual(doc_type, "DOCTOR_LICENSE")
        self.assertGreaterEqual(conf, 0.6)

    def test_classify_mohap_advertising(self):
        doc_type, conf, scores = classify_document(self.sample_mohap_advertising)
        self.assertEqual(doc_type, "MOHAP_ADVERTISING")
        self.assertGreaterEqual(conf, 0.6)

    def test_classify_trade_license(self):
        doc_type, conf, scores = classify_document(self.sample_trade_license)
        self.assertEqual(doc_type, "TRADE_LICENSE")
        self.assertGreaterEqual(conf, 0.6)

    def test_classify_facility_license(self):
        doc_type, conf, scores = classify_document(self.sample_facility_license)
        self.assertEqual(doc_type, "FACILITY_LICENSE")
        self.assertGreaterEqual(conf, 0.6)

    def test_mohap_advertisement_flags_warning_in_doctor_scan(self):
        """Uploading MOHAP advertising instead of doctor license returns soft warning for Step 2 confirmation."""
        is_valid, warning, extracted = extract_doctor_license_verified(self.sample_mohap_advertising)
        self.assertTrue(is_valid)
        self.assertIsNotNone(warning)
        self.assertIn("Advertising Permit", warning)

    def test_trade_license_flags_warning_in_doctor_scan(self):
        """Uploading Trade license instead of doctor license returns soft warning for Step 2 confirmation."""
        is_valid, warning, extracted = extract_doctor_license_verified(self.sample_trade_license)
        self.assertTrue(is_valid)
        self.assertIsNotNone(warning)
        self.assertIn("Commercial Trade License", warning)

    def test_facility_license_flags_warning_in_doctor_scan(self):
        """Uploading Clinic Facility license instead of doctor license returns soft warning for Step 2 confirmation."""
        is_valid, warning, extracted = extract_doctor_license_verified(self.sample_facility_license)
        self.assertTrue(is_valid)
        self.assertIsNotNone(warning)
        self.assertIn("Facility License", warning)

    def test_valid_dha_doctor_license_passes(self):
        is_valid, warning, extracted = extract_doctor_license_verified(self.sample_dha_doctor)
        self.assertTrue(is_valid)
        self.assertIsNone(warning)
        self.assertEqual(extracted["full_name"], "Dr. Sarah Al Mansoori")
        self.assertEqual(extracted["licence_number"], "DHA-P-0091823")
        self.assertEqual(extracted["authority"], "DHA")
        self.assertEqual(extracted["licence_expiry"], "2029-05-15")

    def test_valid_doh_doctor_license_passes(self):
        is_valid, warning, extracted = extract_doctor_license_verified(self.sample_doh_doctor)
        self.assertTrue(is_valid)
        self.assertIsNone(warning)
        self.assertEqual(extracted["full_name"], "Dr. Marcus Vance")
        self.assertEqual(extracted["licence_number"], "DOH-P-771234")
        self.assertEqual(extracted["authority"], "DOH")

    def test_blank_document_rejected(self):
        is_valid, warning, extracted = extract_doctor_license_verified("")
        self.assertFalse(is_valid)
        self.assertIn("blank", warning.lower())


if __name__ == "__main__":
    unittest.main()
