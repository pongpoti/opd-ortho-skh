"use client";

import { Fragment } from "react";
import NextLink from "next/link";
import { Breadcrumb } from "@chakra-ui/react";

type Crumb = { label: string; href: string };

export function PageBreadcrumb({ items, current }: { items: Crumb[]; current: string }) {
  return (
    <Breadcrumb.Root fontSize="sm" color="fg.muted">
      <Breadcrumb.List>
        {items.map((item) => (
          <Fragment key={item.href}>
            <Breadcrumb.Item>
              <Breadcrumb.Link asChild _hover={{ color: "brand.fg" }}>
                <NextLink href={item.href}>{item.label}</NextLink>
              </Breadcrumb.Link>
            </Breadcrumb.Item>
            <Breadcrumb.Separator />
          </Fragment>
        ))}
        <Breadcrumb.Item>
          <Breadcrumb.CurrentLink fontWeight="medium" color="fg">
            {current}
          </Breadcrumb.CurrentLink>
        </Breadcrumb.Item>
      </Breadcrumb.List>
    </Breadcrumb.Root>
  );
}
