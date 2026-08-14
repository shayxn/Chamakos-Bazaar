import React, { createContext, useContext, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SavedOrder {
  id: number;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
  itemCount: number;
}

interface OrderContextType {
  savedOrders: SavedOrder[];
  saveOrder: (order: SavedOrder) => void;
  refreshOrders: () => Promise<void>;
}

const OrderContext = createContext<OrderContextType | null>(null);
const ORDERS_KEY = '@firstpick_orders_v1';

export function OrderProvider({ children }: { children: React.ReactNode }) {
  const [savedOrders, setSavedOrders] = useState<SavedOrder[]>([]);

  const refreshOrders = useCallback(async () => {
    const data = await AsyncStorage.getItem(ORDERS_KEY);
    if (data) setSavedOrders(JSON.parse(data));
  }, []);

  React.useEffect(() => {
    refreshOrders();
  }, [refreshOrders]);

  const saveOrder = useCallback((order: SavedOrder) => {
    setSavedOrders((prev) => {
      const next = [order, ...prev.filter((o) => o.id !== order.id)];
      AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <OrderContext.Provider value={{ savedOrders, saveOrder, refreshOrders }}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrders() {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error('useOrders must be used within OrderProvider');
  return ctx;
}
