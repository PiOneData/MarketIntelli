import AssetDetailClient from '@/components/AssetDetailClient';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function AssetDetailPage({ params }: PageProps) {
    const { id } = await params;
    return <AssetDetailClient id={id} />;
}
