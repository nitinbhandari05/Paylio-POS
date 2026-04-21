import React from "react";
import { usePOS } from "../../context/POSContext";

export default function CategorySidebar() {
  const { categories, selectedCategory, setSelectedCategory } = usePOS();

  return (
    <aside className="category-sidebar card-shell">
      <div className="card-title">Categories</div>
      <div className="category-list">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={selectedCategory === category ? "active" : ""}
          >
            {category}
          </button>
        ))}
      </div>
    </aside>
  );
}
