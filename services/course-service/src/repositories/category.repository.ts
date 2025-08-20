// src/repositories/category.repository.ts
import { eq, and, isNull, asc, ilike } from 'drizzle-orm';
import { db } from '@lms/database';
import { categories } from '@lms/database';

export class CategoryRepository {
  async create(data: any) {
    const [category] = await db.insert(categories).values(data).returning();
    return category;
  }

  async findById(id: string) {
    const [category] = await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, id), eq(categories.isActive, true)));
    return category;
  }

  async findBySlug(slug: string) {
    const [category] = await db
      .select()
      .from(categories)
      .where(and(eq(categories.slug, slug), eq(categories.isActive, true)));
    return category;
  }

  async findAll(includeInactive = false) {
    const conditions = includeInactive ? [] : [eq(categories.isActive, true)];

    return await db
      .select()
      .from(categories)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(categories.sortOrder), asc(categories.name));
  }

  async findRootCategories() {
    return await db
      .select()
      .from(categories)
      .where(and(isNull(categories.parentId), eq(categories.isActive, true)))
      .orderBy(asc(categories.sortOrder), asc(categories.name));
  }

  async findSubcategories(parentId: string) {
    return await db
      .select()
      .from(categories)
      .where(and(eq(categories.parentId, parentId), eq(categories.isActive, true)))
      .orderBy(asc(categories.sortOrder), asc(categories.name));
  }

  async search(query: string) {
    return await db
      .select()
      .from(categories)
      .where(and(ilike(categories.name, `%${query}%`), eq(categories.isActive, true)))
      .orderBy(asc(categories.name));
  }

  async update(id: string, data: any) {
    const [category] = await db
      .update(categories)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(categories.id, id))
      .returning();
    return category;
  }

  async delete(id: string) {
    // Soft delete by setting isActive to false
    await db
      .update(categories)
      .set({ isActive: false, updatedAt: new Date().toISOString() })
      .where(eq(categories.id, id));
  }

  async getCategoryTree() {
    const allCategories = await this.findAll();

    // Build tree structure
    const categoryMap = new Map();
    const rootCategories: any[] = [];

    // First pass: create map
    allCategories.forEach(category => {
      categoryMap.set(category.id, { ...category, children: [] });
    });

    // Second pass: build tree
    allCategories.forEach(category => {
      const categoryWithChildren = categoryMap.get(category.id);
      if (category.parentId) {
        const parent = categoryMap.get(category.parentId);
        if (parent) {
          parent.children.push(categoryWithChildren);
        }
      } else {
        rootCategories.push(categoryWithChildren);
      }
    });

    return rootCategories;
  }
}
