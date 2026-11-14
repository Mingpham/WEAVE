import { Alert } from 'react-native';
import { Composer, type ComposerProps } from '@/features/evidence/composer-screen';
import { workEn as w } from '@/strings/en';

export type TaskSubmissionProps = ComposerProps & {photoExpected: boolean};
export function TaskSubmission({photoExpected, onSend, ...props}: TaskSubmissionProps) {
  return <Composer {...props} onSend={async draft => {
    if (photoExpected && draft.photos.length === 0) {
      // Await the explicit choice before calling the injected server mutation.
      await new Promise<void>((resolve, reject) => Alert.alert(w.submission, w.photoWarning, [
        {text: w.addPhoto, style: 'cancel', onPress: () => reject({code: 'VALIDATION_FAILED'})},
        {text: w.sendWithout, onPress: () => resolve()},
      ], {cancelable: false}));
    }
    await onSend(draft);
  }} />;
}
