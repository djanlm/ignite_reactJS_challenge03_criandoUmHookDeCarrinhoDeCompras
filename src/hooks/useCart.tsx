import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const responseStock = await api.get(`/stock/${productId}`);
      const productStock: Stock = responseStock.data;

      if (productStock.amount === 0) {
        toast.error('Quantidade solicitada fora de estoque')
      } else {

        //Check if the product is already in cart
        const productAlreadyExists = cart.find(product => product.id === productId);

        if (!productAlreadyExists) {
          const response = await api.get(`/products/${productId}`);

          //Adiciona o campo amount no produtos retornados da api
          response.data.amount = 1;
          console.log(response.data);

          setCart([...cart, response.data]);
          localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cart, response.data]));
        } else {
          if (productStock.amount < productAlreadyExists.amount + 1) {
            toast.error('Quantidade solicitada fora de estoque')
          } else {
            // caso o produto já exista no carrinho, ele altera o amount do produto
            // cria o objeto pra ser passado a função updateProductAmount
            const updateProductAmountData: UpdateProductAmount = {
              productId: productAlreadyExists.id,
              amount: productAlreadyExists.amount + 1
            }
            updateProductAmount(updateProductAmountData);
          }

        }



      }

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const cartWithoutTheProduct = cart.filter(product => product.id !== productId);

      if (cart.find(product => product.id === productId)) {
        setCart([...cartWithoutTheProduct]);
      } else {
        toast.error('Erro na remoção do produto');
        return;
      }
      // GRANDE DÚVIDA, QUANDO DOU CONSOLE NO CART AQUI, ELE AINDA NÃO ATUALIZOU COM O PRODUTO RETIRADO,por isso coloquei o cartWithoutTheProduct no stringfy
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartWithoutTheProduct));
    } catch {
      toast.error('Erro na remoção do produto');
    }

  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount === 0) { return; }

      const responseStock = await api.get(`/stock/${productId}`);
      const productStock: Stock = responseStock.data;


      //Find the product so that its amount can be updated
      const foundProduct = cart.find(product => product.id === productId);

      if (foundProduct) {
        if (productStock.amount < amount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        } else {
          foundProduct.amount = amount;
          setCart([...cart]);
        }

      }

      localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cart]));

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
