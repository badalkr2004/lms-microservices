// src/controllers/category.controller.ts
import { Request, Response, NextFunction } from 'express';
import { CategoryService } from '../services/category.service';
import { successResponse } from '../utils/response';
import { AuthenticatedRequest } from '@lms/shared-auth';

export class CategoryController {
  constructor(private categoryService: CategoryService) {}

  createCategory = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const category = await this.categoryService.createCategory(req.body);
      successResponse(res, 'Category created successfully', category, 201);
    } catch (error) {
      next(error);
    }
  };

  getCategories = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const categories = await this.categoryService.getAllCategories(includeInactive);
      successResponse(res, 'Categories retrieved successfully', categories);
    } catch (error) {
      next(error);
    }
  };

  getCategoryById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const category = await this.categoryService.getCategoryById(id);
      successResponse(res, 'Category retrieved successfully', category);
    } catch (error) {
      next(error);
    }
  };

  getCategoryBySlug = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { slug } = req.params;
      const category = await this.categoryService.getCategoryBySlug(slug);
      successResponse(res, 'Category retrieved successfully', category);
    } catch (error) {
      next(error);
    }
  };

  getRootCategories = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const categories = await this.categoryService.getRootCategories();
      successResponse(res, 'Root categories retrieved successfully', categories);
    } catch (error) {
      next(error);
    }
  };

  getSubcategories = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { parentId } = req.params;
      const categories = await this.categoryService.getSubcategories(parentId);
      successResponse(res, 'Subcategories retrieved successfully', categories);
    } catch (error) {
      next(error);
    }
  };

  getCategoryTree = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const categoryTree = await this.categoryService.getCategoryTree();
      successResponse(res, 'Category tree retrieved successfully', categoryTree);
    } catch (error) {
      next(error);
    }
  };

  searchCategories = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { q } = req.query;
      const categories = await this.categoryService.searchCategories(q as string);
      successResponse(res, 'Categories search completed', categories);
    } catch (error) {
      next(error);
    }
  };

  updateCategory = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const category = await this.categoryService.updateCategory(id, req.body);
      successResponse(res, 'Category updated successfully', category);
    } catch (error) {
      next(error);
    }
  };

  deleteCategory = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await this.categoryService.deleteCategory(id);
      successResponse(res, 'Category deleted successfully');
    } catch (error) {
      next(error);
    }
  };
}
