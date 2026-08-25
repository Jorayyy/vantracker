import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  if (!q) return NextResponse.json([]);

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=ph&limit=10&addressdetails=1`,
      { headers: { 'User-Agent': 'VanTracker/1.0' } }
    );
    const data = await res.json();
    const results = data.map((r: any) => ({
      name: r.display_name,
      short_name: r.display_name.split(',').slice(0, 2).join(','),
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      type: r.type,
    }));
    return NextResponse.json(results);
  } catch {
    return NextResponse.json([]);
  }
}
