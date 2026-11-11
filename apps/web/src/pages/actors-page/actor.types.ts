import { ActorRole } from '../../../../api/src/generated/prisma/enums.js';
import type { VerifiedAddress } from '../../api/addresses.api.js';

export { ActorRole };

export type ApplicationType =
  | 'ExcavationPermit'
  | 'RoadUsePermit'
  | 'RoadUsePermitEvent';

export type ContactAvailability = 'Day' | 'Evening' | 'Night' | 'AllDay';

export type Actor = {
  uuid: string;
  name: string;
};

export type ContactPersonDraft = {
  name: string;
  email: string;
  phoneNumber: string;
  availability?: ContactAvailability;
};

export type ActorDraft = {
  role: ActorRole;
  name: string;
  phoneNumber: string;
  email: string;
  cvrNumber: string;
  department: string;
  contactPerson?: ContactPersonDraft;
  address: {
    street: string;
    houseNumber: string;
    postalCode: string;
    city: string;
  };
};

export type SavedActor = Actor & {
  role: ActorRole;
  phoneNumber: string;
  email: string;
  cvrNumber: string | null;
  department: string | null;
  address: ActorDraft['address'] & { uuid: string };
  contactPersons: (Omit<ContactPersonDraft, 'availability'> & {
    uuid: string;
    availability: ContactAvailability;
  })[];
};

export type ActorFormValues = Omit<ActorDraft, 'role' | 'contactPerson'> & {
  role: ActorRole | '';
  contactPerson: Omit<ContactPersonDraft, 'availability'> & {
    availability: ContactAvailability | '';
  };
};

export type ActorFormErrors = Partial<
  Record<
    | 'role'
    | 'name'
    | 'phoneNumber'
    | 'email'
    | 'cvrNumber'
    | 'department'
    | 'contactPersonName'
    | 'contactPersonEmail'
    | 'contactPersonPhoneNumber'
    | 'contactAvailability'
    | 'address',
    string
  >
>;

export type CreateActorValues = {
  role: '' | ActorRole;
  name: string;
  phoneNumber: string;
  email: string;
  address: VerifiedAddress | null;
  addressId: string | null;
  cvrNumber: string;
  department: string;
};

export type ActorSubmission = {
  role: ActorRole;
  name: string;
  phoneNumber: string;
  email: string;
  address: VerifiedAddress;
  cvrNumber?: string;
  department?: string;
  contactPerson?: ContactPersonDraft;
};

export type CreateActorErrors = Partial<
  Record<keyof CreateActorValues, string>
>;

export type ActorFormProps = {
  initialActor?: SavedActor;
  onCancel: () => void;
  onSave: (actor: ActorSubmission) => void | Promise<void>;
};

export type AddressSearchProps = {
  disabled?: boolean;
  error?: string;
  initialAddress?: VerifiedAddress;
  initialAddressId?: string;
  onChange: (address: VerifiedAddress | null, id: string | null) => void;
};
