import { mockProperties } from "@/lib/mock-data";
import { Property } from "@/types";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/ui/header";
import { ProtectedRoute } from "@/components/features/protected-route";
import Image from "next/image";

// Force dynamic rendering to prevent build-time authentication issues
export const dynamic = 'force-dynamic'

export default function DashboardPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 p-4 md:p-8">
        <ProtectedRoute>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {mockProperties.map((property: Property) => (
            <Card key={property.id}>
              <CardHeader>
                <CardTitle>{property.address}</CardTitle>
              </CardHeader>
              <CardContent>
                <Image src={property.images[0]} alt={property.address} width={400} height={192} className="w-full h-48 object-cover rounded-md" />
                <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
                  <div>
                    <p className="font-semibold">Price</p>
                    <p>${property.asking_price.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="font-semibold">ARV</p>
                    <p>${property.estimated_value.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="font-semibold">Beds</p>
                    <p>{property.bedrooms}</p>
                  </div>
                  <div>
                    <p className="font-semibold">Baths</p>
                    <p>{property.bathrooms}</p>
                  </div>
                  <div>
                    <p className="font-semibold">Sqft</p>
                    <p>{property.square_feet.toLocaleString()}</p>
                  </div>
                  
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button>View Details</Button>
                <Button variant="secondary">Comp Vision</Button>
              </CardFooter>
            </Card>
          ))}
        </div>
        </ProtectedRoute>
      </main>
    </div>
  );
}
