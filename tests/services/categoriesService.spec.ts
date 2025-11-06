import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CategoriesService } from '../../src/services/categoriesService';

// Mock apiClient
vi.mock('../../src/lib/apiClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import apiClient from '../../src/lib/apiClient';

describe('CategoriesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('should call apiClient.get with correct route and return data', async () => {
      const mockData = [
        { id: 1, name: 'Category 1' },
        { id: 2, name: 'Category 2' },
      ];
      
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockData });

      const result = await CategoriesService.getAll();

      expect(apiClient.get).toHaveBeenCalledWith('/category');
      expect(result).toEqual(mockData);
    });

    it('should handle errors from apiClient', async () => {
      const mockError = new Error('Network error');
      vi.mocked(apiClient.get).mockRejectedValue(mockError);

      await expect(CategoriesService.getAll()).rejects.toThrow('Network error');
    });
  });

  describe('create', () => {
    it('should call apiClient.post with correct route and data, and return created category', async () => {
      const newCategory = { name: 'New Category', description: 'Test', isActive: true };
      const mockResponse = { id: 3, ...newCategory };
      
      vi.mocked(apiClient.post).mockResolvedValue({ data: mockResponse });

      const result = await CategoriesService.create(newCategory);

      expect(apiClient.post).toHaveBeenCalledWith('/category', newCategory);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('update', () => {
    it('should call apiClient.put with correct route, id, and data', async () => {
      const categoryId = 1;
      const updateData = { name: 'Updated Category' };
      const mockResponse = { id: categoryId, ...updateData };
      
      vi.mocked(apiClient.put).mockResolvedValue({ data: mockResponse });

      const result = await CategoriesService.update(categoryId, updateData);

      expect(apiClient.put).toHaveBeenCalledWith(`/category/${categoryId}`, updateData);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('delete', () => {
    it('should call apiClient.delete with correct route and id', async () => {
      const categoryId = 1;
      const mockResponse = { success: true };
      
      vi.mocked(apiClient.delete).mockResolvedValue({ data: mockResponse });

      const result = await CategoriesService.delete(categoryId);

      expect(apiClient.delete).toHaveBeenCalledWith(`/category/${categoryId}`);
      expect(result).toEqual(mockResponse);
    });
  });
});
