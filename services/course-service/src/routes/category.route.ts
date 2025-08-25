// src/routes/category.routes.ts
import { Router } from 'express';
import { CategoryController } from '../controllers/category.controller';
import { CategoryService } from '../services/category.service';
import { CategoryRepository } from '../repositories/category.repository';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validation.middleware';
import { z } from 'zod';

const router: Router = Router();

// Validation schemas
const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  parentId: z.string().uuid().optional(),
  iconUrl: z.string().url().optional(),
  colorCode: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i)
    .optional(),
  sortOrder: z.number().int().min(0).optional(),
});

const updateCategorySchema = createCategorySchema.partial();

// Initialize dependencies
const categoryRepository = new CategoryRepository();
const categoryService = new CategoryService(categoryRepository);
const categoryController = new CategoryController(categoryService);

// Public routes
router.get('/', categoryController.getCategories);
router.get('/tree', categoryController.getCategoryTree);
router.get('/root', categoryController.getRootCategories);
router.get('/search', categoryController.searchCategories);
router.get('/slug/:slug', categoryController.getCategoryBySlug);
router.get('/:id', categoryController.getCategoryById);
router.get('/:parentId/subcategories', categoryController.getSubcategories);

// Protected routes - Admin only
router.post(
  '/',
  authenticate,
  authorize('*', '*'),
  validate(createCategorySchema),
  categoryController.createCategory
);

router.put(
  '/:id',
  authenticate,
  authorize('*', '*'),
  validate(updateCategorySchema),
  categoryController.updateCategory
);

router.delete('/:id', authenticate, authorize('*', '*'), categoryController.deleteCategory);

export { router as categoryRoutes };
