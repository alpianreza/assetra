export const INVENTORY_STATUSES = ['active', 'inactive', 'maintenance', 'disposed'] as const;
export type InventoryStatus = typeof INVENTORY_STATUSES[number];

export interface QueryInventoryDto {
  search?: string;
  itemTypeId?: number;
  categoryId?: number;
  areaId?: number;
  status?: InventoryStatus;
  picId?: number;
  page?: number;
  limit?: number;
}

export interface InventoryListItem {
  id: number;
  assetCode: string;
  itemType: string | null;
  category: string | null;
  area: string | null;
  specificArea: string | null;
  status: string;
  picUsers: { id: number; name: string; status: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface InventoryDetail {
  id: number;
  assetCode: string;
  typeDescription: string | null;
  specificArea: string | null;
  status: string;
  remark: string | null;
  qty: number;
  qrImage: string | null;
  photo: string | null;
  createdAt: string;
  updatedAt: string;
  categoryId: number;
  categoryName: string;
  areaId: number | null;
  areaName: string | null;
  itemTypeId: number | null;
  itemTypeName: string | null;
  picUsers: { id: number; name: string; status: string }[];
}

export interface InventoryListResult {
  data: {
    items: InventoryListItem[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  };
}

export interface InventoryDetailResult {
  data: InventoryDetail;
}