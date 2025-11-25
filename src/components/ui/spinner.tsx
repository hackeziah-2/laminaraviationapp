import { Loader } from 'lucide-react';
import { useState, useEffect } from 'react';
 function Spinner({ minTime = 1000 }: { minTime?: number }) {
    const [show, setShow] = useState(false);
  
    useEffect(() => {
      const timer = setTimeout(() => setShow(true), 50); 
      return () => clearTimeout(timer);
    }, []);
  
    return show ? (
      <div className="flex justify-center items-center py-4">
        <Loader className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    ) : null;
  }

export { Spinner };