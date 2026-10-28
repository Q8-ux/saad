INSERT INTO `service_settings` (`service_key`, `enabled`, `payment_required`, `price_fils`, `currency`)
VALUES ('memo', 1, 0, 50000, 'KWD')
ON CONFLICT (`service_key`) DO UPDATE SET `price_fils` = 50000, `updated_at` = CURRENT_TIMESTAMP;
