import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CategoriesService } from '../../src/services/categoriesService';
import apiClient from '../../src/lib/apiClient';

vi.mock('../../src/lib/apiClient');

describe('CategoriesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getAll calls apiClient.get with /category', async () => {
    const mockResponse = { data: [{ id: 1, name: 'Test' }] };
    vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

    const result = await CategoriesService.getAll();

    expect(apiClient.get).toHaveBeenCalledWith('/category');
    expect(result).toEqual(mockResponse);
  });

  it('create calls apiClient.post with /category and data', async () => {
    const mockData = { name: 'New Category', description: 'Test desc', isActive: true };
    const mockResponse = { data: { id: 1, ...mockData } };
    vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

    const result = await CategoriesService.create(mockData);

    expect(apiClient.post).toHaveBeenCalledWith('/category', mockData);
    expect(result).toEqual(mockResponse);
  });

  it('update calls apiClient.put with correct route and data', async () => {
    const id = 1;
    const mockData = { name: 'Updated', description: 'Updated desc', isActive: false };
    const mockResponse = { data: { id, ...mockData } };
    vi.mocked(apiClient.put).mockResolvedValue(mockResponse);

    const result = await CategoriesService.update(id, mockData);

    expect(apiClient.put).toHaveBeenCalledWith('/category/1', mockData);
    expect(result).toEqual(mockResponse);
  });

  it('delete calls apiClient.delete with correct route', async () => {
    const id = 1;
    const mockResponse = { data: null };
    vi.mocked(apiClient.delete).mockResolvedValue(mockResponse);

    const result = await CategoriesService.delete(id);

    expect(apiClient.delete).toHaveBeenCalledWith('/category/1');
    expect(result).toEqual(mockResponse);
  });
});
