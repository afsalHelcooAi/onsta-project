import unittest
from fastapi import HTTPException
from app.api.v1.clinic_profile import check_mohap_compliance

class TestClinicProfileMOHAP(unittest.TestCase):
    def test_prohibited_superlatives_rejected(self):
        prohibited_samples = [
            ("Best Dental Clinic in Dubai", "Display Name"),
            ("We are the only clinic in UAE with this machine", "Description"),
            ("100% guaranteed results for all treatments", "Description"),
            ("Visit the cheapest dermatology clinic", "Display Name"),
            ("We are #1 in aesthetic care", "Display Name"),
        ]
        for text, field in prohibited_samples:
            with self.subTest(text=text):
                with self.assertRaises(HTTPException) as ctx:
                    check_mohap_compliance(text, field)
                self.assertEqual(ctx.exception.status_code, 422)
                self.assertIn("MOHAP Compliance Violation", ctx.exception.detail)

    def test_factual_medical_descriptions_accepted(self):
        factual_samples = [
            ("Al Noor Medical & Laser Clinic", "Display Name"),
            ("Evidence-based dermatological care and laser treatments with board-certified practitioners.", "Description"),
            ("Modern Laser & Dermatology Suite", "Photo Caption"),
            ("Consultant examination room with dermoscopy equipment", "Photo Caption"),
        ]
        for text, field in factual_samples:
            with self.subTest(text=text):
                # Should not raise any exception
                check_mohap_compliance(text, field)

if __name__ == '__main__':
    unittest.main()
