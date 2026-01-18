-- Seed de categorías iniciales (globales, sin usuario)

-- ============================================
-- CATEGORÍAS DE INGRESOS
-- ============================================

INSERT INTO categories (name, type, icon, color, user_id, is_active, created_at, updated_at)
VALUES
  ('Salario', 'INCOME', 'Briefcase', '#10B981', NULL, true, NOW(), NOW()),
  ('Freelance', 'INCOME', 'Laptop', '#059669', NULL, true, NOW(), NOW()),
  ('Inversiones', 'INCOME', 'TrendingUp', '#34D399', NULL, true, NOW(), NOW()),
  ('Venta', 'INCOME', 'Tag', '#6EE7B7', NULL, true, NOW(), NOW()),
  ('Regalo', 'INCOME', 'Gift', '#A7F3D0', NULL, true, NOW(), NOW()),
  ('Reembolso', 'INCOME', 'RotateCcw', '#D1FAE5', NULL, true, NOW(), NOW()),
  ('Bono', 'INCOME', 'Award', '#047857', NULL, true, NOW(), NOW()),
  ('Otros Ingresos', 'INCOME', 'DollarSign', '#065F46', NULL, true, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ============================================
-- CATEGORÍAS DE GASTOS
-- ============================================

-- Necesidades básicas
INSERT INTO categories (name, type, icon, color, user_id, is_active, created_at, updated_at)
VALUES
  ('Alimentación', 'EXPENSE', 'UtensilsCrossed', '#EF4444', NULL, true, NOW(), NOW()),
  ('Transporte', 'EXPENSE', 'Car', '#F59E0B', NULL, true, NOW(), NOW()),
  ('Vivienda', 'EXPENSE', 'Home', '#8B5CF6', NULL, true, NOW(), NOW()),
  ('Servicios', 'EXPENSE', 'Zap', '#3B82F6', NULL, true, NOW(), NOW()),
  ('Salud', 'EXPENSE', 'Heart', '#EC4899', NULL, true, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Estilo de vida
INSERT INTO categories (name, type, icon, color, user_id, is_active, created_at, updated_at)
VALUES
  ('Entretenimiento', 'EXPENSE', 'Film', '#F43F5E', NULL, true, NOW(), NOW()),
  ('Compras', 'EXPENSE', 'ShoppingBag', '#14B8A6', NULL, true, NOW(), NOW()),
  ('Restaurantes', 'EXPENSE', 'Coffee', '#F97316', NULL, true, NOW(), NOW()),
  ('Educación', 'EXPENSE', 'GraduationCap', '#6366F1', NULL, true, NOW(), NOW()),
  ('Deporte', 'EXPENSE', 'Dumbbell', '#84CC16', NULL, true, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Financiero
INSERT INTO categories (name, type, icon, color, user_id, is_active, created_at, updated_at)
VALUES
  ('Ahorros', 'EXPENSE', 'PiggyBank', '#0EA5E9', NULL, true, NOW(), NOW()),
  ('Inversiones', 'EXPENSE', 'LineChart', '#06B6D4', NULL, true, NOW(), NOW()),
  ('Seguros', 'EXPENSE', 'Shield', '#8B5CF6', NULL, true, NOW(), NOW()),
  ('Deudas', 'EXPENSE', 'CreditCard', '#DC2626', NULL, true, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Otros
INSERT INTO categories (name, type, icon, color, user_id, is_active, created_at, updated_at)
VALUES
  ('Regalos', 'EXPENSE', 'Gift', '#F472B6', NULL, true, NOW(), NOW()),
  ('Mascotas', 'EXPENSE', 'PawPrint', '#FB923C', NULL, true, NOW(), NOW()),
  ('Suscripciones', 'EXPENSE', 'Smartphone', '#A855F7', NULL, true, NOW(), NOW()),
  ('Impuestos', 'EXPENSE', 'Receipt', '#64748B', NULL, true, NOW(), NOW()),
  ('Viajes', 'EXPENSE', 'Plane', '#0891B2', NULL, true, NOW(), NOW()),
  ('Otros Gastos', 'EXPENSE', 'Package', '#71717A', NULL, true, NOW(), NOW())
ON CONFLICT DO NOTHING;