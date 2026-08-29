-- Alt puanlar ve tekrar tercih. Eski/seed satırlarda NULL; o boyutun ortalamasına girmez.

ALTER TABLE reviews ADD COLUMN quality INTEGER;
ALTER TABLE reviews ADD COLUMN timeliness INTEGER;
ALTER TABLE reviews ADD COLUMN communication INTEGER;
ALTER TABLE reviews ADD COLUMN would_repeat INTEGER;
