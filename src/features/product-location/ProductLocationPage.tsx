import { useState } from 'react';

interface ProductLocation {
  id: number;
  name: string;
  description: string;
}

export default ProductLocationPage;

export function ProductLocationPage() {
  const [productLocations, setProductLocations] = useState<ProductLocation[]>([
    { id: 1, name: 'B001', description: 'Складской ряд A, полка 1' },
    { id: 2, name: 'B002', description: 'Складской ряд A, полка 2' },
    { id: 3, name: 'B003', description: 'Складской ряд B, полка 1' },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newLocation, setNewLocation] = useState({ name: '', description: '' });

  const handleAddLocation = () => {
    if (newLocation.name.trim()) {
      const location: ProductLocation = {
        id: Date.now(),
        name: newLocation.name.trim(),
        description: newLocation.description.trim(),
      };
      setProductLocations([...productLocations, location]);
      setNewLocation({ name: '', description: '' });
      setIsModalOpen(false);
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Позиции расположения продуктов</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark transition-colors"
        >
          Добавить позицию
        </button>
      </div>

      {/* Product Locations List - Keyboard Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {productLocations.map((location) => (
          <div
            key={location.id}
            className="bg-card p-4 rounded-lg border border-border hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="font-semibold text-lg">{location.name}</div>
            <div className="text-muted-foreground text-sm mt-1">{location.description}</div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold mb-4">Добавить позицию расположения</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Название</label>
                <input
                  type="text"
                  value={newLocation.name}
                  onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                  placeholder="Введите название позиции"
                  className="w-full px-3 py-2 border rounded-md bg-background"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Описание</label>
                <textarea
                  value={newLocation.description}
                  onChange={(e) => setNewLocation({ ...newLocation, description: e.target.value })}
                  placeholder="Введите описание позиции"
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-md hover:bg-muted transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleAddLocation}
                  className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark transition-colors"
                >
                  Добавить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
 