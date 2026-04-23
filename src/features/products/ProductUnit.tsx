
import { useEffect, useState, type ChangeEvent, type FormEvent, type MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../app/store';
import { PageHeader } from '../../components/shared/PageHeader';
import { DataTable, type Column } from '../../components/shared/DataTable';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent } from '../../components/ui/Card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '../../components/ui/Dialog';
import { Label } from '../../components/ui/Label';
import { latinToCyrillic } from '../../utils/transliteration';
import type { ProductUnit, ProductUnitFormData } from '../../types';
import { productUnitService } from '../../services/productUnitService';

function ProductUnit() {
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const isSuperUser = Boolean(user?.is_superuser);
    const [units, setUnits] = useState<ProductUnit[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingUnit, setEditingUnit] = useState<ProductUnit | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState<ProductUnitFormData>({
        name_uz: '',
        name_uz_cyrl: '',
    });

    const loadUnits = async () => {
        setLoading(true);
        try {
            const data = await productUnitService.getAll();
            setUnits(data);
        } catch (error) {
            console.error('Failed to load product units:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadUnits();
    }, []);

    const handleNameChange = (value: string) => {
        setFormData((prev) => ({
            ...prev,
            name_uz: value,
            name_uz_cyrl: latinToCyrillic(value),
        }));
    };

    const handleNameCyrlChange = (value: string) => {
        setFormData((prev) => ({
            ...prev,
            name_uz_cyrl: value,
        }));
    };

    const handleOpenDialog = async (unit?: ProductUnit) => {
        if (unit) {
            setEditingUnit(unit);
            setIsDialogOpen(true);
            try {
                const fresh = await productUnitService.getById(unit.id);
                setFormData({
                    name_uz: fresh.name_uz,
                    name_uz_cyrl: fresh.name_uz_cyrl,
                });
            } catch (error) {
                console.error('Failed to load product unit:', error);
                setFormData({
                    name_uz: unit.name_uz,
                    name_uz_cyrl: unit.name_uz_cyrl,
                });
            }
            return;
        }

        setEditingUnit(null);
        setFormData({ name_uz: '', name_uz_cyrl: '' });
        setIsDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setIsDialogOpen(false);
        setEditingUnit(null);
        setFormData({ name_uz: '', name_uz_cyrl: '' });
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!formData.name_uz.trim()) return;

        try {
            setSaving(true);
            if (editingUnit) {
                await productUnitService.update(editingUnit.id, formData);
                toast.success(t('products.unitUpdated'));
            } else {
                await productUnitService.create(formData);
                toast.success(t('products.unitAdded'));
            }
            await loadUnits();
            handleCloseDialog();
        } catch (error) {
            console.error('Failed to save product unit:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!id) return;
        try {
            setDeleting(true);
            await productUnitService.delete(id);
            toast.success(t('products.unitDeleted'));
            await loadUnits();
        } catch (error) {
            console.error('Failed to delete product unit:', error);
        } finally {
            setDeleting(false);
            setDeleteId(null);
        }
    };

    const filteredUnits = units.filter((unit) => {
        const value = unit.name_uz || '';
        const cyrl = unit.name_uz_cyrl || '';
        const query = searchQuery.toLowerCase();
        return (
            value.toLowerCase().includes(query) ||
            cyrl.toLowerCase().includes(query)
        );
    });

    const columns: Column<ProductUnit>[] = [
        {
            key: 'id',
            header: 'ID',
            render: (item: ProductUnit) => item.id,
        },
        {
            key: 'name_uz',
            header: t('products.unitName'),
            render: (item: ProductUnit) => item.name_uz,
        },
    ];

    if (isSuperUser) {
        columns.push({
            key: 'actions',
            header: t('common.actions'),
            className: 'text-right',
            render: (item: ProductUnit) => (
                <div className="flex items-center justify-end gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e: MouseEvent<HTMLButtonElement>) => {
                            e.stopPropagation();
                            void handleOpenDialog(item);
                        }}
                    >
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e: MouseEvent<HTMLButtonElement>) => {
                            e.stopPropagation();
                            setDeleteId(item.id);
                        }}
                    >
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                </div>
            ),
        });
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('products.units')}
                actions={isSuperUser ? (
                    <Button onClick={() => handleOpenDialog()}>
                        <Plus className="h-4 w-4 mr-2" />
                        {t('products.addUnit')}
                    </Button>
                ) : undefined}
            />

            <div className="flex items-center gap-4">
                <div className="relative w-full flex-1 sm:max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t('common.search')}
                        value={searchQuery}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>

            <div className="space-y-3 md:hidden">
                {loading ? (
                    <div className="rounded-lg border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
                        {t('common.localLoading')}
                    </div>
                ) : filteredUnits.length === 0 ? (
                    <div className="rounded-lg border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
                        {t('products.noUnits')}
                    </div>
                ) : (
                    filteredUnits.map((unit) => (
                        <Card key={unit.id}>
                            <CardContent className="space-y-3 p-4">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <p className="font-semibold">{unit.id}</p>
                                        <p className="text-sm text-muted-foreground">{unit.name_uz}</p>
                                    </div>
                                    {isSuperUser && (
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => void handleOpenDialog(unit)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => setDeleteId(unit.id)}
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            <div className="hidden md:block">
                <DataTable
                    data={filteredUnits}
                    columns={columns}
                    loading={loading}
                    emptyMessage={t('products.noUnits')}
                    loadingMessage={t('common.localLoading')}
                    onRowClick={isSuperUser ? (item: ProductUnit) => void handleOpenDialog(item) : undefined}
                />
            </div>

            {isSuperUser && (
                <>
                    <ConfirmDialog
                        open={!!deleteId}
                        onOpenChange={(open: boolean) => !open && setDeleteId(null)}
                        onConfirm={() => deleteId && void handleDelete(deleteId)}
                        title={t('common.delete')}
                        description={t('products.unitDeleted')}
                        confirmText={t('common.delete')}
                        variant="destructive"
                        loading={deleting}
                    />

                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>
                                    {editingUnit ? t('products.editUnit') : t('products.addUnit')}
                                </DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit}>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name_uz">{t('products.unitName')}</Label>
                                        <Input
                                            id="name_uz"
                                            value={formData.name_uz}
                                            onChange={(e: ChangeEvent<HTMLInputElement>) => handleNameChange(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="name_uz_cyrl">{t('products.unitName')} (Cyrillic)</Label>
                                        <Input
                                            id="name_uz_cyrl"
                                            value={formData.name_uz_cyrl}
                                            onChange={(e: ChangeEvent<HTMLInputElement>) => handleNameCyrlChange(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={handleCloseDialog}>
                                        {t('common.cancel')}
                                    </Button>
                                    <Button type="submit" disabled={saving}>
                                        {saving ? t('common.localLoading') : t('common.save')}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </>
            )}
        </div>
    );
}

export default ProductUnit;