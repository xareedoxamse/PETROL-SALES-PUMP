"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Fuel, Plus, Download, Upload, AlertTriangle, Edit, Save, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';

interface FuelSale {
  id?: number;
  date: string;
  rate_per_liter: number;
  dispenser_open: number;
  dispenser_close: number;
  units_sold: number;
  total_sale: number;
  created_at?: string;
}

export default function FuelCenterDashboard() {
  const [sales, setSales] = useState<FuelSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<{
    rate_per_liter: number;
    dispenser_open: number;
    dispenser_close: number;
  }>({
    rate_per_liter: 0,
    dispenser_open: 0,
    dispenser_close: 0,
  });
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    rate_per_liter: 9500,
    dispenser_open: '',
    dispenser_close: '',
  });

  const getYesterdayClosingBalance = async (currentDate: string) => {
    try {
      const yesterday = new Date(currentDate);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('fuel_sales')
        .select('dispenser_close')
        .eq('date', yesterdayStr)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      
      return data && data.length > 0 ? data[0].dispenser_close : 0;
    } catch (err) {
      console.error('Error fetching yesterday closing balance:', err);
      return 0;
    }
  };

  const handleDateChange = async (newDate: string) => {
    const yesterdayClosing = await getYesterdayClosingBalance(newDate);
    setFormData({
      ...formData,
      date: newDate,
      dispenser_open: yesterdayClosing.toString(),
    });
  };

  useEffect(() => {
    // Set initial opening balance when component mounts
    const initializeOpeningBalance = async () => {
      const currentDate = new Date().toISOString().split('T')[0];
      const yesterdayClosing = await getYesterdayClosingBalance(currentDate);
      setFormData(prev => ({
        ...prev,
        dispenser_open: yesterdayClosing.toString(),
      }));
    };
    
    initializeOpeningBalance();
  }, []);

  const fetchSales = async () => {
    try {
      const { data, error } = await supabase
        .from('fuel_sales')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      setSales(data || []);
    } catch (err) {
      console.error('Error fetching sales:', err);
      setError('Failed to fetch sales data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const dispenserOpen = formData.dispenser_open === '' ? 0 : Number(formData.dispenser_open);
    const dispenserClose = formData.dispenser_close === '' ? 0 : Number(formData.dispenser_close);
    
    if (dispenserClose <= dispenserOpen) {
      setError('Dispenser Close must be greater than Dispenser Open');
      return;
    }

    const unitsSold = (formData.dispenser_open === '' || formData.dispenser_close === '') ? 0 : dispenserClose - dispenserOpen;
    const totalSale = unitsSold * formData.rate_per_liter;

    const newSale: FuelSale = {
      date: formData.date,
      rate_per_liter: formData.rate_per_liter,
      dispenser_open: dispenserOpen,
      dispenser_close: dispenserClose,
      rate_per_liter: formData.rate_per_liter,
      dispenser_open: dispenserOpen,
      dispenser_close: dispenserClose,
      units_sold: unitsSold,
      total_sale: totalSale,
    };

    try {
      const { error } = await supabase
        .from('fuel_sales')
        .insert([newSale]);

      if (error) throw error;

      await fetchSales();
      setFormData({
        date: new Date().toISOString().split('T')[0],
        rate_per_liter: 9500,
        dispenser_open: '',
        dispenser_close: '',
      });
      setError(null);
    } catch (err) {
      console.error('Error adding sale:', err);
      setError('Failed to add sale record');
    }
  };

  const handleEdit = (sale: FuelSale) => {
    setEditingId(sale.id!);
    setEditData({
      rate_per_liter: sale.rate_per_liter,
      dispenser_open: sale.dispenser_open,
      dispenser_close: sale.dispenser_close,
    });
  };

  const handleSaveEdit = async (id: number) => {
    if (editData.dispenser_close <= editData.dispenser_open) {
      setError('Dispenser Close must be greater than Dispenser Open');
      return;
    }

    const unitsSold = editData.dispenser_close - editData.dispenser_open;
    const totalSale = unitsSold * editData.rate_per_liter;

    try {
      const { error } = await supabase
        .from('fuel_sales')
        .update({
          rate_per_liter: editData.rate_per_liter,
          dispenser_open: editData.dispenser_open,
          dispenser_close: editData.dispenser_close,
          units_sold: unitsSold,
          total_sale: totalSale,
        })
        .eq('id', id);

      if (error) throw error;

      await fetchSales();
      setEditingId(null);
      setError(null);
    } catch (err) {
      console.error('Error updating sale:', err);
      setError('Failed to update sale record');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditData({
      rate_per_liter: 0,
      dispenser_open: 0,
      dispenser_close: 0,
    });
  };

  const exportData = () => {
    // Sort sales by date (older dates first)
    const sortedSales = [...sales].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const worksheetData = [
      ['Date', 'Rate per Liter', 'Dispenser Open', 'Dispenser Close', 'Units Sold', 'Total Sale'],
      ...sortedSales.map(sale => [
        sale.date,
        sale.rate_per_liter,
        sale.dispenser_open,
        sale.dispenser_close,
        sale.units_sold,
        sale.total_sale
      ])
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Fuel Sales');
    
    XLSX.writeFile(workbook, `fuel-sales-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Fuel className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Fuel className="w-10 h-10 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">Fuel Center Dashboard</h1>
          </div>
          <p className="text-gray-600 text-lg">PETROL SALE PUMP ONE</p>
        </div>

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-700">{error}</AlertDescription>
          </Alert>
        )}

        {/* Add New Sale Form */}
        <Card className="mb-8 shadow-lg border-0 bg-white/70 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add New Sale Record
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date" className="text-sm font-medium text-gray-700">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleDateChange(e.target.value)}
                  required
                  className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rate" className="text-sm font-medium text-gray-700">Rate per Liter</Label>
                <Input
                  id="rate"
                  type="number"
                  value={formData.rate_per_liter}
                  onChange={(e) => setFormData({ ...formData, rate_per_liter: Number(e.target.value) })}
                  required
                  className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="open" className="text-sm font-medium text-gray-700">Dispenser Open</Label>
                <Input
                  id="open"
                  type="number"
                  step="0.01"
                 placeholder="Auto-filled from yesterday's closing"
                  value={formData.dispenser_open}
                 onChange={(e) => setFormData({ ...formData, dispenser_open: e.target.value })}
                  className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="close" className="text-sm font-medium text-gray-700">Dispenser Close</Label>
                <Input
                  id="close"
                  type="number"
                  step="0.01"
                 placeholder="Enter dispenser close reading"
                  value={formData.dispenser_close}
                 onChange={(e) => setFormData({ ...formData, dispenser_close: e.target.value })}
                  className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="col-span-full flex gap-3">
                <Button 
                  type="submit" 
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium px-6 py-2 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Sale Record
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={exportData}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-2 rounded-lg transition-all duration-200"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Excel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Sales Overview */}
        <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-slate-700 to-slate-800 text-white rounded-t-lg">
            <CardTitle className="flex items-center justify-between">
              <span>Sales Overview</span>
              <Badge variant="secondary" className="bg-white/20 text-white">
                {sales.length} Records
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold text-gray-900">Date</TableHead>
                    <TableHead className="font-semibold text-gray-900">Rate per Liter</TableHead>
                    <TableHead className="font-semibold text-gray-900">Dispenser Open</TableHead>
                    <TableHead className="font-semibold text-gray-900">Dispenser Close</TableHead>
                    <TableHead className="font-semibold text-gray-900">Units Sold</TableHead>
                    <TableHead className="font-semibold text-gray-900">Total Sale</TableHead>
                    <TableHead className="font-semibold text-gray-900">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        No sales records found. Add your first sale record above.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sales.map((sale) => {
                      const isEditing = editingId === sale.id;
                      return (
                        <>
                        <TableRow key={sale.id} className="hover:bg-gray-50 transition-colors">
                          <TableCell className="font-medium">{sale.date}</TableCell>
                          <TableCell>
                            {isEditing ? (
                              <Input
                              type="number"
                              value={editData.rate_per_liter}
                              onChange={(e) => setEditData({...editData, rate_per_liter: Number(e.target.value)})}
                              className="w-24"
                              />
                            ) : (
                              sale.rate_per_liter.toLocaleString()
                            )}
                          </TableCell>
                          <TableCell>
                            {isEditing ? (
                              <Input
                              type="number"
                              step="0.01"
                              value={editData.dispenser_open}
                                onChange={(e) => setEditData({...editData, dispenser_open: Number(e.target.value)})}
                                className="w-24"
                              />
                            ) : (
                              sale.dispenser_open.toFixed(2)
                            )}
                          </TableCell>
                          <TableCell>
                            {isEditing ? (
                              <Input
                              type="number"
                                step="0.01"
                                value={editData.dispenser_close}
                                onChange={(e) => setEditData({...editData, dispenser_close: Number(e.target.value)})}
                                className="w-24"
                              />
                            ) : (
                              sale.dispenser_close.toFixed(2)
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {isEditing ? 
                              ((editData.dispenser_close - editData.dispenser_open).toFixed(2) + ' L') :
                              (sale.units_sold.toFixed(2) + ' L')
                            }
                          </TableCell>
                          <TableCell className="font-semibold text-green-600">
                            {isEditing ? 
                              ((editData.dispenser_close - editData.dispenser_open) * editData.rate_per_liter).toLocaleString() :
                              sale.total_sale.toLocaleString()
                            }
                          </TableCell>
                          <TableCell>
                            {formatCurrency(sale.total_sale)}
                          </TableCell>
                          <TableCell>
                            {isEditing ? (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveEdit(sale.id!)}
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                  >
                                  <Save className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleCancelEdit}
                                  className="border-gray-300"
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(sale)}
                                className="border-gray-300 hover:bg-gray-50"
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      </>

                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        {sales.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">Total Sales</p>
                    <p className="text-2xl font-bold">
                      {sales.reduce((sum, sale) => sum + sale.total_sale, 0).toLocaleString()}
                    </p>
                  </div>
                  <Fuel className="w-8 h-8 text-blue-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm font-medium">Total Liters Sold</p>
                    <p className="text-2xl font-bold">
                      {sales.reduce((sum, sale) => sum + sale.units_sold, 0).toFixed(2)} L
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-green-400 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold">L</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm font-medium">Average Sale</p>
                    <p className="text-2xl font-bold">
                      {(sales.reduce((sum, sale) => sum + sale.total_sale, 0) / sales.length).toLocaleString()}
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-purple-400 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold">Avg</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}