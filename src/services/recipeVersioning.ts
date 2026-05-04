import { collection, doc, query, where, getDocs, addDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';
import { Recipe, RecipeVariant, RecipeVersion, OperationType } from '../types';
import { handleFirestoreError } from './firestore';
import { diff } from 'deep-object-diff';

export async function getRecipeVersions(recipeId: string): Promise<RecipeVersion[]> {
  const versionsRef = collection(db, 'recipes', recipeId, 'versions');
  try {
    const q = query(versionsRef);
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as RecipeVersion)).sort((a,b) => b.version - a.version);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `/recipes/${recipeId}/versions`);
    return [];
  }
}

export async function createRecipeVariant(parentRecipe: Recipe, variantName: string, userId: string, modifiedRecipe: Partial<Recipe>): Promise<string> {
  const differences = diff(parentRecipe, modifiedRecipe) as Partial<Recipe>;
  
  const variant: Omit<RecipeVariant, 'id'> = {
    parentRecipeId: parentRecipe.id!,
    ownerId: userId,
    variantName,
    differences,
    createdAt: new Date().toISOString()
  };

  try {
    const docRef = await addDoc(collection(db, 'recipeVariants'), variant);
    return docRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, '/recipeVariants');
    throw err;
  }
}

export async function getRecipeVariants(recipeId: string): Promise<RecipeVariant[]> {
  try {
    const q = query(collection(db, 'recipeVariants'), where('parentRecipeId', '==', recipeId));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as RecipeVariant));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, '/recipeVariants');
    return [];
  }
}

export function computeVariant(parentRecipe: Recipe, variant: RecipeVariant): Recipe {
  // Merge diff over parent. Since deep-object-diff diff output is an object with changed props:
  return mergeDeep(JSON.parse(JSON.stringify(parentRecipe)), variant.differences);
}

function mergeDeep(target: any, source: any) {
  for (const key of Object.keys(source)) {
    if (source[key] instanceof Object && key in target && !Array.isArray(source[key])) {
      Object.assign(source[key], mergeDeep(target[key], source[key]));
    }
  }
  Object.assign(target || {}, source);
  return target;
}
