// src/services/category.service.ts
import slugify from 'slugify';
import { CategoryRepository } from '../repositories/category.repository';
import { NotFoundError, ConflictError } from '../utils/errors';

export interface CreateCategoryInput {
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  iconUrl?: string;
  colorCode?: string;
  sortOrder?: number;
}

export interface UpdateCategoryInput extends Partial<CreateCategoryInput> {}

export class CategoryService {
  constructor(private categoryRepository: CategoryRepository) {}

  async createCategory(data: CreateCategoryInput) {
    const slug = slugify(data.name, { lower: true, strict: true });

    // Check if slug already exists
    const existingCategory = await this.categoryRepository.findBySlug(slug);
    if (existingCategory) {
      throw new ConflictError('Category with this name already exists');
    }

    // If parentId is provided, verify parent exists
    if (data.parentId) {
      const parent = await this.categoryRepository.findById(data.parentId);
      if (!parent) {
        throw new NotFoundError('Parent category not found');
      }
    }

    const categoryData = {
      ...data,
      slug,
      sortOrder: data.sortOrder || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return await this.categoryRepository.create(categoryData);
  }

  async getCategoryById(id: string) {
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundError('Category not found');
    }
    return category;
  }

  async getCategoryBySlug(slug: string) {
    const category = await this.categoryRepository.findBySlug(slug);
    if (!category) {
      throw new NotFoundError('Category not found');
    }
    return category;
  }

  async getAllCategories(includeInactive = false) {
    return await this.categoryRepository.findAll(includeInactive);
  }

  async getRootCategories() {
    return await this.categoryRepository.findRootCategories();
  }

  async getSubcategories(parentId: string) {
    // Verify parent exists
    const parent = await this.categoryRepository.findById(parentId);
    if (!parent) {
      throw new NotFoundError('Parent category not found');
    }

    return await this.categoryRepository.findSubcategories(parentId);
  }

  async getCategoryTree() {
    return await this.categoryRepository.getCategoryTree();
  }

  async searchCategories(query: string) {
    if (!query.trim()) {
      return [];
    }
    return await this.categoryRepository.search(query.trim());
  }

  async updateCategory(id: string, data: UpdateCategoryInput) {
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundError('Category not found');
    }

    let updateData = { ...data };

    // Generate new slug if name is updated
    if (data.name && data.name !== category.name) {
      const slug = slugify(data.name, { lower: true, strict: true });
      const existingCategory = await this.categoryRepository.findBySlug(slug);
      if (existingCategory && existingCategory.id !== id) {
        throw new ConflictError('Category with this name already exists');
      }
      updateData.slug = slug;
    }

    // If parentId is being updated, verify new parent exists
    if (data.parentId !== undefined) {
      if (data.parentId === id) {
        throw new ConflictError('Category cannot be its own parent');
      }

      if (data.parentId) {
        const parent = await this.categoryRepository.findById(data.parentId);
        if (!parent) {
          throw new NotFoundError('Parent category not found');
        }
      }
    }

    return await this.categoryRepository.update(id, updateData);
  }

  async deleteCategory(id: string) {
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundError('Category not found');
    }

    // Check if category has subcategories
    const subcategories = await this.categoryRepository.findSubcategories(id);
    if (subcategories.length > 0) {
      throw new ConflictError('Cannot delete category with subcategories');
    }

    // TODO: Check if category has courses associated
    // This would require a course count check

    await this.categoryRepository.delete(id);
  }
}
