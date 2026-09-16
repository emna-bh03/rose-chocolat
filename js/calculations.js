/* ==========================================================================
   Rose Chocolat Calculation & Financial Engine
   ========================================================================== */

export function normalizeUnit(unit) {
  if (!unit) return 'pièce';
  const u = unit.toLowerCase().trim();
  if (['g', 'gramme', 'grammes'].includes(u)) return 'g';
  if (['kg', 'kilo', 'kilogramme', 'kilogrammes'].includes(u)) return 'kg';
  if (['ml', 'millilitre', 'millilitres'].includes(u)) return 'ml';
  if (['l', 'litre', 'litres'].includes(u)) return 'L';
  return 'pièce';
}

export function calculateIngredientCost(ingredient, mpList) {
  const mp = mpList.find(item => item.id === ingredient.mpId);
  if (!mp) return 0;

  const mpPurchaseUnit = normalizeUnit(mp.unit);
  const ingUnit = normalizeUnit(ingredient.unit || mp.unit);
  const qty = parseFloat(ingredient.qty) || 0;
  const purchasePrice = parseFloat(mp.purchasePrice) || 0;

  let cost = 0;
  if (mpPurchaseUnit === 'kg' && ingUnit === 'g') {
    cost = (qty / 1000) * purchasePrice;
  } else if (mpPurchaseUnit === 'kg' && ingUnit === 'kg') {
    cost = qty * purchasePrice;
  } else if (mpPurchaseUnit === 'g' && ingUnit === 'kg') {
    cost = (qty * 1000) * purchasePrice;
  } else if (mpPurchaseUnit === 'L' && ingUnit === 'ml') {
    cost = (qty / 1000) * purchasePrice;
  } else if (mpPurchaseUnit === 'L' && ingUnit === 'L') {
    cost = qty * purchasePrice;
  } else if (mpPurchaseUnit === 'ml' && ingUnit === 'L') {
    cost = (qty * 1000) * purchasePrice;
  } else {
    cost = qty * purchasePrice;
  }

  return Math.max(0, cost);
}

export function calculateRecipeCost(recipe, mpList) {
  if (!recipe || !recipe.ingredients || !Array.isArray(recipe.ingredients)) {
    return { totalCost: 0, costPerUnit: 0, ingredientBreakdown: [] };
  }

  let totalCost = 0;
  const ingredientBreakdown = recipe.ingredients.map(ing => {
    const mp = mpList.find(m => m.id === ing.mpId);
    const ingCost = calculateIngredientCost(ing, mpList);
    totalCost += ingCost;
    return {
      mpId: ing.mpId,
      mpName: mp ? mp.name : 'Inconnu',
      qty: ing.qty,
      unit: ing.unit || (mp ? mp.unit : 'pièce'),
      unitPrice: mp ? mp.purchasePrice : 0,
      mpUnit: mp ? mp.unit : 'pièce',
      cost: ingCost
    };
  });

  const yieldQty = Math.max(1, parseFloat(recipe.yieldQty) || 1);
  const costPerUnit = totalCost / yieldQty;

  return {
    totalCost: Math.round(totalCost * 100) / 100,
    costPerUnit: Math.round(costPerUnit * 100) / 100,
    ingredientBreakdown
  };
}

export function calculateRecipeFinancials(sellingPrice, totalCost, yieldQty = 1) {
  const price = parseFloat(sellingPrice) || 0;
  const cost = parseFloat(totalCost) || 0;
  const qty = Math.max(1, parseFloat(yieldQty) || 1);

  const grossMargin = price - cost;
  const marginPercentage = price > 0 ? (grossMargin / price) * 100 : 0;
  const netProfitPerUnit = grossMargin / qty;

  let health = 'success';
  let healthLabel = 'Marge Excellente';
  if (marginPercentage < 40) {
    health = 'danger';
    healthLabel = 'Marge Faible';
  } else if (marginPercentage < 60) {
    health = 'warning';
    healthLabel = 'Marge Correcte';
  }

  return {
    sellingPrice: price,
    totalCost: cost,
    grossMargin: Math.round(grossMargin * 100) / 100,
    marginPercentage: Math.round(marginPercentage * 10) / 10,
    netProfitPerUnit: Math.round(netProfitPerUnit * 100) / 100,
    health,
    healthLabel
  };
}

/**
 * Check if current MP stock is sufficient for an order, and return missing ingredients if any
 */
export function checkOrderStockAvailability(order, recipes, mpList) {
  if (!order || !order.items || !Array.isArray(order.items)) {
    return { isAvailable: true, missingItems: [] };
  }

  const requiredMpMap = {}; // mpId -> requiredQtyInMpUnit

  order.items.forEach(item => {
    const recipe = recipes.find(r => r.id === item.recipeId);
    if (!recipe || !recipe.ingredients) return;

    const orderQty = parseFloat(item.qty) || 1;
    const yieldQty = Math.max(1, parseFloat(recipe.yieldQty) || 1);
    const batchMultiplier = orderQty / yieldQty;

    recipe.ingredients.forEach(ing => {
      const mp = mpList.find(m => m.id === ing.mpId);
      if (!mp) return;

      const neededQtyInRecipeUnit = parseFloat(ing.qty) * batchMultiplier;
      const mpUnit = normalizeUnit(mp.unit);
      const ingUnit = normalizeUnit(ing.unit || mp.unit);

      let neededStockQty = neededQtyInRecipeUnit;
      if (mpUnit === 'kg' && ingUnit === 'g') {
        neededStockQty = neededQtyInRecipeUnit / 1000;
      } else if (mpUnit === 'L' && ingUnit === 'ml') {
        neededStockQty = neededQtyInRecipeUnit / 1000;
      } else if (mpUnit === 'g' && ingUnit === 'kg') {
        neededStockQty = neededQtyInRecipeUnit * 1000;
      } else if (mpUnit === 'ml' && ingUnit === 'L') {
        neededStockQty = neededQtyInRecipeUnit * 1000;
      }

      requiredMpMap[mp.id] = (requiredMpMap[mp.id] || 0) + neededStockQty;
    });
  });

  const missingItems = [];
  Object.keys(requiredMpMap).forEach(mpId => {
    const mp = mpList.find(m => m.id === mpId);
    if (!mp) return;

    const needed = requiredMpMap[mpId];
    const currentStock = parseFloat(mp.stockQty) || 0;

    if (currentStock < needed) {
      const missingQty = Math.round((needed - currentStock) * 100) / 100;
      missingItems.push({
        mpId: mp.id,
        name: mp.name,
        missingQty,
        unit: mp.unit,
        currentStock,
        needed
      });
    }
  });

  return {
    isAvailable: missingItems.length === 0,
    missingItems
  };
}

export function deductStockForOrder(order, recipes, mpList) {
  const updatedMpList = JSON.parse(JSON.stringify(mpList));
  const errors = [];
  const logDetails = [];

  if (!order || !order.items || !Array.isArray(order.items)) {
    return { success: false, updatedMpList, errors: ['Commande invalide'] };
  }

  order.items.forEach(orderItem => {
    const recipe = recipes.find(r => r.id === orderItem.recipeId);
    if (!recipe) {
      errors.push(`Recette introuvable`);
      return;
    }

    const orderQty = parseFloat(orderItem.qty) || 1;
    const yieldQty = Math.max(1, parseFloat(recipe.yieldQty) || 1);
    const batchMultiplier = orderQty / yieldQty;

    recipe.ingredients.forEach(ing => {
      const mpIndex = updatedMpList.findIndex(m => m.id === ing.mpId);
      if (mpIndex === -1) return;

      const mp = updatedMpList[mpIndex];
      const neededQtyInRecipeUnit = parseFloat(ing.qty) * batchMultiplier;

      const mpUnit = normalizeUnit(mp.unit);
      const ingUnit = normalizeUnit(ing.unit || mp.unit);

      let neededStockQty = neededQtyInRecipeUnit;
      if (mpUnit === 'kg' && ingUnit === 'g') {
        neededStockQty = neededQtyInRecipeUnit / 1000;
      } else if (mpUnit === 'L' && ingUnit === 'ml') {
        neededStockQty = neededQtyInRecipeUnit / 1000;
      } else if (mpUnit === 'g' && ingUnit === 'kg') {
        neededStockQty = neededQtyInRecipeUnit * 1000;
      } else if (mpUnit === 'ml' && ingUnit === 'L') {
        neededStockQty = neededQtyInRecipeUnit * 1000;
      }

      const previousStock = parseFloat(mp.stockQty) || 0;
      const newStock = Math.max(0, previousStock - neededStockQty);
      
      if (previousStock < neededStockQty) {
        errors.push(`Manque: ${mp.name} (${(neededStockQty - previousStock).toFixed(2)} ${mp.unit})`);
      }

      mp.stockQty = Math.round(newStock * 100) / 100;
      mp.lastUpdated = new Date().toISOString().split('T')[0];

      logDetails.push({
        mpName: mp.name,
        deducted: neededStockQty,
        unit: mp.unit,
        remaining: mp.stockQty
      });
    });
  });

  return {
    success: errors.length === 0,
    updatedMpList,
    errors,
    logDetails
  };
}

export function restoreStockForOrder(order, recipes, mpList) {
  const updatedMpList = JSON.parse(JSON.stringify(mpList));
  if (!order || !order.items || !Array.isArray(order.items)) {
    return { success: false, updatedMpList };
  }

  order.items.forEach(orderItem => {
    const recipe = recipes.find(r => r.id === orderItem.recipeId);
    if (!recipe) return;

    const orderQty = parseFloat(orderItem.qty) || 1;
    const yieldQty = Math.max(1, parseFloat(recipe.yieldQty) || 1);
    const batchMultiplier = orderQty / yieldQty;

    recipe.ingredients.forEach(ing => {
      const mpIndex = updatedMpList.findIndex(m => m.id === ing.mpId);
      if (mpIndex === -1) return;

      const mp = updatedMpList[mpIndex];
      const neededQtyInRecipeUnit = parseFloat(ing.qty) * batchMultiplier;

      const mpUnit = normalizeUnit(mp.unit);
      const ingUnit = normalizeUnit(ing.unit || mp.unit);

      let neededStockQty = neededQtyInRecipeUnit;
      if (mpUnit === 'kg' && ingUnit === 'g') {
        neededStockQty = neededQtyInRecipeUnit / 1000;
      } else if (mpUnit === 'L' && ingUnit === 'ml') {
        neededStockQty = neededQtyInRecipeUnit / 1000;
      } else if (mpUnit === 'g' && ingUnit === 'kg') {
        neededStockQty = neededQtyInRecipeUnit * 1000;
      } else if (mpUnit === 'ml' && ingUnit === 'L') {
        neededStockQty = neededQtyInRecipeUnit * 1000;
      }

      const previousStock = parseFloat(mp.stockQty) || 0;
      const newStock = previousStock + neededStockQty;
      mp.stockQty = Math.round(newStock * 100) / 100;
      mp.lastUpdated = new Date().toISOString().split('T')[0];
    });
  });

  return { success: true, updatedMpList };
}

export function calculateOrderCostMPSnapshot(order, recipes, mpList) {
  if (!order || !order.items || !Array.isArray(order.items)) return 0;
  let totalCost = 0;
  order.items.forEach(item => {
    const recipe = recipes.find(r => r.id === item.recipeId);
    if (recipe) {
      const { costPerUnit } = calculateRecipeCost(recipe, mpList);
      totalCost += costPerUnit * (parseFloat(item.qty) || 1);
    }
  });
  return Math.round(totalCost * 100) / 100;
}

export function calculateFinancialsSummary(orders = [], recipes = [], mpList = [], expenses = []) {
  let totalRevenue = 0;
  let totalCostMP = 0;
  let totalDepositPaid = 0;
  let remainingToCollect = 0;

  const safeOrders = Array.isArray(orders) ? orders : [];
  const safeRecipes = Array.isArray(recipes) ? recipes : [];
  const safeMpList = Array.isArray(mpList) ? mpList : [];
  const safeExpenses = Array.isArray(expenses) ? expenses : [];

  safeOrders.forEach(ord => {
    if (ord.status !== 'Cancelled' && ord.status !== 'Annulée') {
      const orderTotal = parseFloat(ord.totalAmount) || 0;
      const deposit = parseFloat(ord.depositPaid) || 0;
      
      totalRevenue += orderTotal;
      totalDepositPaid += deposit;
      remainingToCollect += Math.max(0, orderTotal - deposit);

      if (typeof ord.costMPSnapshot === 'number' && ord.costMPSnapshot >= 0) {
        totalCostMP += ord.costMPSnapshot;
      } else if (ord.items && Array.isArray(ord.items)) {
        ord.items.forEach(item => {
          const recipe = recipes.find(r => r.id === item.recipeId);
          if (recipe) {
            const { costPerUnit } = calculateRecipeCost(recipe, mpList);
            totalCostMP += costPerUnit * (parseFloat(item.qty) || 1);
          }
        });
      }
    }
  });

  let totalExpenses = 0;
  if (Array.isArray(expenses)) {
    expenses.forEach(exp => {
      totalExpenses += parseFloat(exp.amount) || 0;
    });
  }

  const netProfit = totalRevenue - totalCostMP - totalExpenses;
  const netMarginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  return {
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalCostMP: Math.round(totalCostMP * 100) / 100,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    netProfit: Math.round(netProfit * 100) / 100,
    netMarginPercent: Math.round(netMarginPercent * 10) / 10,
    totalDepositPaid: Math.round(totalDepositPaid * 100) / 100,
    remainingToCollect: Math.round(remainingToCollect * 100) / 100
  };
}
