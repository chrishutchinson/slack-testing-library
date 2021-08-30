import { HeaderBlock, KnownBlock, SectionBlock } from "@slack/types";

export const findTextInBlock = (text: string) => (block: KnownBlock) => {
  if (!["section", "header"].includes(block.type)) {
    return false;
  }

  if (!(block as SectionBlock | HeaderBlock).text?.text.includes(text)) {
    return false;
  }

  return true;
};
