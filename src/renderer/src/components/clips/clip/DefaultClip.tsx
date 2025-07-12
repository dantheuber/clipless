import { ClipItem } from '../../../providers/clips';

interface DefaultClipProps {
  clip: ClipItem;
}

export const DefaultClip = ({ clip }: DefaultClipProps) => {
  return <span>{clip.content}</span>;
};
