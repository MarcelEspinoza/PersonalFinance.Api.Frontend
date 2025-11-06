import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CategoriesService } from '../../src/services/categoriesService';
import apiClient from '../../src/lib/apiClient';

// Mock apiClient
vi.mock('../../src/lib/apiClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('CategoriesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getAll calls apiClient.get with correct route', async () => {
    const mockResponse = {
      data: [
        { id: 1, name: 'Comida', description: '', isActive: true },
        { id: 2, name: 'Transporte', description: '', isActive: true },
      ],
    };

    vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

    const result = await CategoriesService.getAll();

    expect(apiClient.get).toHaveBeenCalledWith('/category');
    expect(result).toEqual(mockResponse);
  });

  it('create calls apiClient.post with correct route and data', async () => {
    const categoryData = {
      name: 'Entretenimiento',
      description: 'Gastos de entretenimiento',
      isActive: true,
    };

    const mockResponse = {
      data: { id: 3, ...categoryData },
    };

    vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

    const result = await CategoriesService.create(categoryData);

    expect(apiClient.post).toHaveBeenCalledWith('/category', categoryData);
    expect(result).toEqual(mockResponse);
  });

  it('update calls apiClient.put with correct route and data', async () => {
    const categoryId = 1;
    const updateData = { name: 'Alimentos' };

    const mockResponse = {
      data: { id: categoryId, name: 'Alimentos', description: '', isActive: true },
    };

    vi.mocked(apiClient.put).mockResolvedValue(mockResponse);

    const result = await CategoriesService.update(categoryId, updateData);

    expect(apiClient.put).toHaveBeenCalledWith(`/category/${categoryId}`, updateData);
    expect(result).toEqual(mockResponse);
  });

  it('delete calls apiClient.delete with correct route', async () => {
    const categoryId = 1;

    const mockResponse = { data: null };

    vi.mocked(apiClient.delete).mockResolvedValue(mockResponse);

    const result = await CategoriesService.delete(categoryId);

    expect(apiClient.delete).toHaveBeenCalledWith(`/category/${categoryId}`);
    expect(result).toEqual(mockResponse);
  });

  it('propagates axios response structure', async () => {
    // Verify that the service returns the full axios response, not just data
    const mockAxiosResponse = {
      data: [{ id: 1, name: 'Test' }],
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
    };

    vi.mocked(apiClient.get).mockResolvedValue(mockAxiosResponse as any);

    const result = await CategoriesService.getAll();

    // The service should return the full axios response
    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('status');
    expect(result.data).toEqual([{ id: 1, name: 'Test' }]);
  });
});
