-- V007: Add optional default_image_url to master_treatments and image_url to services

ALTER TABLE master_treatments
    ADD COLUMN IF NOT EXISTS default_image_url TEXT;

ALTER TABLE services
    ADD COLUMN IF NOT EXISTS image_url TEXT;
