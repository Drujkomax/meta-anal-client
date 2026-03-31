import Link from 'next/link';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav className="flex items-center text-sm mb-6 text-muted overflow-x-auto whitespace-nowrap">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        
        return (
          <div key={item.label} className="flex items-center">
            {isLast ? (
              <span className="font-semibold text-ink">{item.label}</span>
            ) : (
              <>
                <Link href={item.href || '#'} className="hover:text-ink transition hover:underline">
                  {item.label}
                </Link>
                <span className="mx-2 text-line">/</span>
              </>
            )}
          </div>
        );
      })}
    </nav>
  );
}
