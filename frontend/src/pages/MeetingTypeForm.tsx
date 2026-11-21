import { Button, NativeSelect, Stack, Text, Textarea, TextInput } from '@mantine/core';
import { useState, type SubmitEvent } from 'react';

import { createMeetingType, type MeetingType } from '../api';

const durations = [15, 30, 45, 60, 75, 90, 105, 120] as const;

export function MeetingTypeForm({ onCreated }: { onCreated: (item: MeetingType) => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState<MeetingType['durationMinutes']>(15);
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [failed, setFailed] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setSuccess(false);
    setFailed(false);
    setErrors({});
    try {
      const result = await createMeetingType({ title, description, durationMinutes: duration });
      if (result.data) {
        onCreated(result.data);
        setTitle('');
        setDescription('');
        setDuration(15);
        setSuccess(true);
      } else if (result.error.code === 'validation_error' && result.error.fields?.length) {
        setErrors(
          Object.fromEntries(result.error.fields.map((item) => [item.field, item.message])),
        );
      } else {
        setFailed(true);
      }
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <Stack>
        <TextInput
          label="Название"
          error={errors.title}
          value={title}
          onChange={(event) => setTitle(event.currentTarget.value)}
        />
        <Textarea
          label="Описание"
          error={errors.description}
          value={description}
          onChange={(event) => setDescription(event.currentTarget.value)}
        />
        <NativeSelect
          label="Длительность"
          error={errors.durationMinutes}
          value={duration}
          data={durations.map((value) => ({ value: String(value), label: value + ' мин' }))}
          onChange={(event) => {
            const value = Number(event.currentTarget.value);
            setDuration(durations.find((item) => item === value) ?? 15);
          }}
        />
        <Button type="submit" loading={pending}>
          Создать
        </Button>
        {success && <Text role="status">Тип встречи создан</Text>}
        {failed && <Text role="alert">Не удалось создать тип встречи</Text>}
      </Stack>
    </form>
  );
}
